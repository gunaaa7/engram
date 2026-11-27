import "server-only";

import { createHash } from "node:crypto";

import { headers } from "next/headers";

import { createServiceSupabaseClient } from "@/lib/supabase";

type RateLimitScope = "signup" | "entry-create" | "query";

type RateLimitRule = {
  limit: number;
  scope: RateLimitScope;
  windowSeconds: number;
};

type RateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      status: 429 | 503;
      reason: string;
      retryAfterSeconds: number;
    };

const rateLimiterUnavailable = {
  allowed: false,
  status: 503,
  reason: "This action is temporarily unavailable. Please try again shortly.",
  retryAfterSeconds: 30,
} satisfies RateLimitResult;

const DEFAULT_WINDOW_SECONDS = 60 * 60;

function getPositiveIntEnv(
  name: keyof NodeJS.ProcessEnv,
  defaultValue: number,
) {
  const value = Number(process.env[name]);

  if (Number.isInteger(value) && value > 0) {
    return value;
  }

  return defaultValue;
}

function getRule(scope: RateLimitScope, key: "ip" | "user"): RateLimitRule {
  if (scope === "signup") {
    return {
      scope,
      limit: getPositiveIntEnv("PUBLIC_SIGNUP_LIMIT_PER_IP_PER_HOUR", 5),
      windowSeconds: DEFAULT_WINDOW_SECONDS,
    };
  }

  if (scope === "entry-create") {
    return {
      scope,
      limit:
        key === "user"
          ? getPositiveIntEnv("ENTRY_CREATE_LIMIT_PER_USER_PER_HOUR", 60)
          : getPositiveIntEnv("ENTRY_CREATE_LIMIT_PER_IP_PER_HOUR", 120),
      windowSeconds: DEFAULT_WINDOW_SECONDS,
    };
  }

  return {
    scope,
    limit:
      key === "user"
        ? getPositiveIntEnv("QUERY_LIMIT_PER_USER_PER_HOUR", 30)
        : getPositiveIntEnv("QUERY_LIMIT_PER_IP_PER_HOUR", 60),
    windowSeconds: DEFAULT_WINDOW_SECONDS,
  };
}

function hashIdentifier(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function buildBucket(input: {
  key: "ip" | "user";
  scope: RateLimitScope;
  value: string;
}) {
  return `${input.scope}:${input.key}:${hashIdentifier(input.value)}`;
}

function extractClientIp(headersLike: Pick<Headers, "get">) {
  const forwardedFor = headersLike.get("x-forwarded-for");

  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();

    if (firstIp) {
      return firstIp;
    }
  }

  const fallbackHeaders = [
    "x-real-ip",
    "cf-connecting-ip",
    "x-vercel-forwarded-for",
  ];

  for (const headerName of fallbackHeaders) {
    const value = headersLike.get(headerName)?.trim();

    if (value) {
      return value;
    }
  }

  return "local-dev";
}

function formatRetryAfter(seconds: number) {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }

  const minutes = Math.ceil(seconds / 60);

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

async function consumeRateLimit(
  bucket: string,
  rule: RateLimitRule,
): Promise<RateLimitResult> {
  try {
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase.rpc("consume_rate_limit", {
      p_bucket: bucket,
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    });

    if (error) {
      console.error("Rate limit RPC failed:", error.code);
      return rateLimiterUnavailable;
    }

    const row = Array.isArray(data) ? data[0] : data;

    if (row?.allowed === true) {
      return { allowed: true };
    }

    if (
      row?.allowed === false &&
      Number.isInteger(row.retry_after_seconds) &&
      row.retry_after_seconds > 0
    ) {
      return buildFailureResult(rule.scope, row.retry_after_seconds);
    }

    console.error("Rate limit RPC returned an invalid decision.");
  } catch (error) {
    console.error(
      "Rate limit RPC failed:",
      error instanceof Error ? error.name : typeof error,
    );
  }

  return rateLimiterUnavailable;
}

function buildFailureResult(
  scope: RateLimitScope,
  retryAfterSeconds: number,
): RateLimitResult {
  const windowText = formatRetryAfter(retryAfterSeconds);

  if (scope === "signup") {
    return {
      allowed: false,
      status: 429,
      reason: `Too many sign-up attempts from this connection. Try again in ${windowText}.`,
      retryAfterSeconds,
    };
  }

  if (scope === "entry-create") {
    return {
      allowed: false,
      status: 429,
      reason: `Memory capture limit reached. Try again in ${windowText}.`,
      retryAfterSeconds,
    };
  }

  return {
    allowed: false,
    status: 429,
    reason: `Question limit reached. Try again in ${windowText}.`,
    retryAfterSeconds,
  };
}

export async function getClientIpFromRequest(request: Request) {
  return extractClientIp(request.headers);
}

export async function getClientIpFromHeaders() {
  const headerStore = await headers();
  return extractClientIp(headerStore);
}

export async function enforceSignupRateLimit(ipAddress: string) {
  return consumeRateLimit(
    buildBucket({
      key: "ip",
      scope: "signup",
      value: ipAddress,
    }),
    getRule("signup", "ip"),
  );
}

export async function enforceUserWriteRateLimit(input: {
  ipAddress: string;
  scope: "entry-create" | "query";
  userId: string;
}): Promise<RateLimitResult> {
  const checks = await Promise.all([
    consumeRateLimit(
      buildBucket({
        key: "user",
        scope: input.scope,
        value: input.userId,
      }),
      getRule(input.scope, "user"),
    ),
    consumeRateLimit(
      buildBucket({
        key: "ip",
        scope: input.scope,
        value: input.ipAddress,
      }),
      getRule(input.scope, "ip"),
    ),
  ]);

  return checks.find((check) => !check.allowed) ?? { allowed: true };
}
