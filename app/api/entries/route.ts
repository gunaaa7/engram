import { NextResponse } from "next/server";

import { embed } from "@/lib/embeddings";
import { jsonError, parseJsonBody } from "@/lib/http";
import {
  enforceUserWriteRateLimit,
  getClientIpFromRequest,
} from "@/lib/rateLimit";
import { createServiceSupabaseClient } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/supabaseAuthServer";
import type { EntryInputMetadata } from "@/lib/types";

export const runtime = "nodejs";

type CreateEntryBody = {
  content?: unknown;
  source?: unknown;
  input_metadata?: unknown;
};

function parseSource(value: unknown) {
  if (typeof value !== "string") {
    return "text";
  }

  const normalizedValue = value.trim().toLowerCase();
  return normalizedValue || "text";
}

function parseInputMetadata(value: unknown): EntryInputMetadata {
  if (value == null) {
    return null;
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return jsonError("Authentication required.", 401);
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("entries")
    .select("id, content, source, input_metadata, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("GET /api/entries failed to read entries:", error);
    return jsonError("Failed to read entries.", 500);
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return jsonError("Authentication required.", 401);
  }

  const body = await parseJsonBody<CreateEntryBody>(request);
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  const source = parseSource(body?.source);
  const inputMetadata = parseInputMetadata(body?.input_metadata);

  if (!content) {
    return jsonError("Content is required.", 400);
  }

  if (content.length < 10) {
    return jsonError("Content must be at least 10 characters.", 400);
  }

  const ipAddress = await getClientIpFromRequest(request);
  const rateLimitResult = await enforceUserWriteRateLimit({
    ipAddress,
    scope: "entry-create",
    userId: user.id,
  });

  if (!rateLimitResult.allowed) {
    return jsonError(rateLimitResult.reason ?? "Rate limit exceeded.", 429, {
      "Retry-After": String(rateLimitResult.retryAfterSeconds),
    });
  }

  let embedding: number[];

  try {
    embedding = await embed(content, "document");
  } catch (error) {
    console.error("POST /api/entries failed to generate embedding:", error);
    return jsonError("Failed to generate embedding.", 500);
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("entries")
    .insert({
      content,
      source,
      input_metadata: inputMetadata,
      embedding,
      user_id: user.id,
    })
    .select("id, content, source, input_metadata, created_at")
    .single();

  if (error) {
    console.error("POST /api/entries failed to save entry:", error);
    return jsonError("Failed to save entry.", 500);
  }

  return NextResponse.json(data, { status: 201 });
}
