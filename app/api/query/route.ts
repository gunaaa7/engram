import { NextResponse } from "next/server";

import { embed } from "@/lib/embeddings";
import { jsonError, parseJsonBody } from "@/lib/http";
import {
  NO_RELEVANT_MESSAGE,
} from "@/lib/prompts";
import { synthesizeAnswer } from "@/lib/synthesis";
import { createServiceSupabaseClient } from "@/lib/supabase";
import type { Entry, EntryMatch } from "@/lib/types";

export const runtime = "nodejs";

const MATCH_COUNT = 5;
const MIN_SIMILARITY = 0.2;

type QueryBody = {
  question?: unknown;
};

type EntryEmbeddingRow = Entry & {
  embedding: number[] | string | null;
};

function parseVector(value: number[] | string | null) {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  try {
    const parsedValue = JSON.parse(value);
    return Array.isArray(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length || a.length === 0) {
    return Number.NEGATIVE_INFINITY;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < a.length; index += 1) {
    const valueA = a[index];
    const valueB = b[index];

    dotProduct += valueA * valueB;
    normA += valueA * valueA;
    normB += valueB * valueB;
  }

  if (normA === 0 || normB === 0) {
    return Number.NEGATIVE_INFINITY;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function getRelevantEntryMatches(
  queryEmbedding: number[],
): Promise<EntryMatch[]> {
  const supabase = createServiceSupabaseClient();
  const rpcResult = await supabase.rpc("match_entries", {
    query_embedding: queryEmbedding,
    match_count: MATCH_COUNT,
  });

  if (rpcResult.error) {
    console.error("POST /api/query failed during RPC retrieval:", rpcResult.error);
  }

  const rpcMatches = ((rpcResult.data ?? []) as EntryMatch[]).filter(
    (entry) => Number.isFinite(entry.similarity),
  );

  if (rpcMatches.length > 0) {
    return rpcMatches;
  }

  const { data, error } = await supabase
    .from("entries")
    .select("id, content, source, input_metadata, created_at, embedding");

  if (error) {
    if (rpcResult.error) {
      throw rpcResult.error;
    }

    throw error;
  }

  return ((data ?? []) as EntryEmbeddingRow[])
    .map<EntryMatch | null>((entry) => {
      const embedding = parseVector(entry.embedding);

      if (!embedding) {
        return null;
      }

      return {
        id: entry.id,
        content: entry.content,
        source: entry.source,
        input_metadata: entry.input_metadata,
        created_at: entry.created_at,
        similarity: cosineSimilarity(queryEmbedding, embedding),
      };
    })
    .filter((entry): entry is EntryMatch => {
      return entry != null && Number.isFinite(entry.similarity);
    })
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, MATCH_COUNT);
}

export async function POST(request: Request) {
  const body = await parseJsonBody<QueryBody>(request);
  const question =
    typeof body?.question === "string" ? body.question.trim() : "";

  if (!question) {
    return jsonError("Question is required.", 400);
  }

  let queryEmbedding: number[];

  try {
    queryEmbedding = await embed(question, "query");
  } catch (error) {
    console.error("POST /api/query failed to generate embedding:", error);
    return jsonError("Failed to generate query embedding.", 500);
  }

  let matches: EntryMatch[];

  try {
    matches = await getRelevantEntryMatches(queryEmbedding);
  } catch (error) {
    console.error("POST /api/query failed during retrieval:", error);
    return jsonError("Failed to retrieve relevant entries.", 500);
  }

  const relevantSources = matches
    .filter((entry) => entry.similarity >= MIN_SIMILARITY)
    .map<Entry>((entry) => ({
      id: entry.id,
      content: entry.content,
      source: entry.source,
      input_metadata: entry.input_metadata,
      created_at: entry.created_at,
    }));

  if (relevantSources.length === 0) {
    return NextResponse.json({
      answer: NO_RELEVANT_MESSAGE,
      sources: [],
    });
  }

  try {
    const answer = await synthesizeAnswer({
      question,
      retrievedEntries: relevantSources,
    });

    return NextResponse.json({
      answer,
      sources: relevantSources,
    });
  } catch (error) {
    console.error("POST /api/query failed during synthesis:", error);
    return jsonError("Failed to synthesize an answer.", 500);
  }
}
