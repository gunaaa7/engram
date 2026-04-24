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

type RateLimitResult = {
  allowed: boolean;
  reason?: string;
  retryAfterSeconds: number;
};

type ConsumeRateLimitRow = {
  allowed: boolean;
  remaining: number;
  reset_at: string;
  retry_after_seconds: number;
};

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

async function consumeRateLimit(bucket: string, rule: RateLimitRule) {
  const supabase = createServiceSupabaseClient();
  const result = await supabase.rpc("consume_rate_limit", {
    p_bucket: bucket,
    p_limit: rule.limit,
    p_window_seconds: rule.windowSeconds,
  });

  if (result.error) {
    console.error("Rate limit RPC failed:", result.error);

    return {
      allowed: true,
      remaining: rule.limit,
      reset_at: new Date(Date.now() + rule.windowSeconds * 1000).toISOString(),
      retry_after_seconds: 0,
    } satisfies ConsumeRateLimitRow;
  }

  const row = Array.isArray(result.data)
    ? ((result.data[0] ?? null) as ConsumeRateLimitRow | null)
    : ((result.data ?? null) as ConsumeRateLimitRow | null);

  if (!row) {
    return {
      allowed: true,
      remaining: rule.limit,
      reset_at: new Date(Date.now() + rule.windowSeconds * 1000).toISOString(),
      retry_after_seconds: 0,
    } satisfies ConsumeRateLimitRow;
  }

  return row;
}

function buildFailureResult(
  scope: RateLimitScope,
  retryAfterSeconds: number,
): RateLimitResult {
  const windowText = formatRetryAfter(retryAfterSeconds);

  if (scope === "signup") {
    return {
      allowed: false,
      reason: `Too many sign-up attempts from this connection. Try again in ${windowText}.`,
      retryAfterSeconds,
    };
  }

  if (scope === "entry-create") {
    return {
      allowed: false,
      reason: `Memory capture limit reached. Try again in ${windowText}.`,
      retryAfterSeconds,
    };
  }

  return {
    allowed: false,
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
  const rule = getRule("signup", "ip");
  const result = await consumeRateLimit(
    buildBucket({
      key: "ip",
      scope: "signup",
      value: ipAddress,
    }),
    rule,
  );

  if (result.allowed) {
    return {
      allowed: true,
      retryAfterSeconds: 0,
    } satisfies RateLimitResult;
  }

  return buildFailureResult("signup", result.retry_after_seconds);
}

export async function enforceUserWriteRateLimit(input: {
  ipAddress: string;
  scope: "entry-create" | "query";
  userId: string;
}) {
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

  const firstFailedCheck = checks.find((check) => !check.allowed);

  if (!firstFailedCheck) {
    return {
      allowed: true,
      retryAfterSeconds: 0,
    } satisfies RateLimitResult;
  }

  return buildFailureResult(input.scope, firstFailedCheck.retry_after_seconds);
}
