import { NextResponse } from "next/server";

import { embed } from "@/lib/embeddings";
import { jsonError, parseJsonBody } from "@/lib/http";
import { createServiceSupabaseClient } from "@/lib/supabase";
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
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("entries")
    .select("id, content, source, input_metadata, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("GET /api/entries failed to read entries:", error);
    return jsonError("Failed to read entries.", 500);
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
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
    })
    .select("id, content, source, input_metadata, created_at")
    .single();

  if (error) {
    console.error("POST /api/entries failed to save entry:", error);
    return jsonError("Failed to save entry.", 500);
  }

  return NextResponse.json(data, { status: 201 });
}
