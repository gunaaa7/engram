import { NextResponse } from "next/server";

import { buildChatTurn, buildThreadTitle } from "@/lib/chats";
import { embed } from "@/lib/embeddings";
import { jsonError, parseJsonBody } from "@/lib/http";
import { NO_RELEVANT_MESSAGE } from "@/lib/prompts";
import {
  enforceUserWriteRateLimit,
  getClientIpFromRequest,
} from "@/lib/rateLimit";
import { synthesizeAnswer } from "@/lib/synthesis";
import { createServiceSupabaseClient } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/supabaseAuthServer";
import type {
  ChatThreadSummary,
  Entry,
  EntryMatch,
  QueryResponse,
} from "@/lib/types";

export const runtime = "nodejs";

const MATCH_COUNT = 5;
const MIN_SIMILARITY = 0.2;
const QUERY_FAILURE_MESSAGE =
  "I hit a problem while searching memory for that question.";

type QueryBody = {
  question?: unknown;
  threadId?: unknown;
};

type EntryEmbeddingRow = Entry & {
  embedding: number[] | string | null;
};

type ChatMessageInsertRow = {
  content: string;
  created_at: string;
  id: string;
  status: "complete" | "error";
};

function parseThreadId(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue || null;
}

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
  userId: string,
): Promise<EntryMatch[]> {
  const supabase = createServiceSupabaseClient();
  const rpcResult = await supabase.rpc("match_entries", {
    query_embedding: queryEmbedding,
    match_count: MATCH_COUNT,
    owner_id: userId,
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
    .select("id, content, source, input_metadata, created_at, embedding")
    .eq("user_id", userId);

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

async function resolveThread(
  threadId: string | null,
  question: string,
  userId: string,
): Promise<ChatThreadSummary> {
  const supabase = createServiceSupabaseClient();

  if (threadId) {
    const { data, error } = await supabase
      .from("chat_threads")
      .select("id, title, created_at, updated_at")
      .eq("id", threadId)
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("POST /api/query failed to read thread:", error);
      throw new Error("Chat not found.");
    }

    return data as ChatThreadSummary;
  }

  const { data, error } = await supabase
    .from("chat_threads")
    .insert({
      title: buildThreadTitle(question),
      user_id: userId,
    })
    .select("id, title, created_at, updated_at")
    .single();

  if (error) {
    console.error("POST /api/query failed to create thread:", error);
    throw new Error("Failed to create chat.");
  }

  return data as ChatThreadSummary;
}

async function getThreadSummary(threadId: string, userId: string) {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("chat_threads")
    .select("id, title, created_at, updated_at")
    .eq("id", threadId)
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("POST /api/query failed to refresh thread:", error);
    throw new Error("Failed to refresh chat.");
  }

  return data as ChatThreadSummary;
}

async function insertMessage(input: {
  content: string;
  role: "user" | "assistant";
  status: "complete" | "error";
  threadId: string;
  userId: string;
}) {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      content: input.content,
      role: input.role,
      status: input.status,
      thread_id: input.threadId,
      user_id: input.userId,
    })
    .select("id, content, status, created_at")
    .single();

  if (error) {
    console.error("POST /api/query failed to create message:", error);
    throw new Error("Failed to save chat message.");
  }

  return data as ChatMessageInsertRow;
}

async function insertMessageSources(messageId: string, sources: Entry[]) {
  if (sources.length === 0) {
    return;
  }

  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.from("chat_message_sources").insert(
    sources.map((source) => ({
      entry_id: source.id,
      message_id: messageId,
    })),
  );

  if (error) {
    console.error("POST /api/query failed to save message sources:", error);
    throw new Error("Failed to save chat sources.");
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return jsonError("Authentication required.", 401);
  }

  const body = await parseJsonBody<QueryBody>(request);
  const question =
    typeof body?.question === "string" ? body.question.trim() : "";

  if (!question) {
    return jsonError("Question is required.", 400);
  }

  const ipAddress = await getClientIpFromRequest(request);
  const rateLimitResult = await enforceUserWriteRateLimit({
    ipAddress,
    scope: "query",
    userId: user.id,
  });

  if (!rateLimitResult.allowed) {
    return jsonError(rateLimitResult.reason ?? "Rate limit exceeded.", 429, {
      "Retry-After": String(rateLimitResult.retryAfterSeconds),
    });
  }

  let thread: ChatThreadSummary;

  try {
    thread = await resolveThread(parseThreadId(body?.threadId), question, user.id);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to prepare chat.",
      500,
    );
  }

  let userMessage: ChatMessageInsertRow;

  try {
    userMessage = await insertMessage({
      content: question,
      role: "user",
      status: "complete",
      threadId: thread.id,
      userId: user.id,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to save question.",
      500,
    );
  }

  let answer = NO_RELEVANT_MESSAGE;
  let sources: Entry[] = [];
  let turnState: "complete" | "error" = "complete";

  try {
    const queryEmbedding = await embed(question, "query");
    const matches = await getRelevantEntryMatches(queryEmbedding, user.id);

    sources = matches
      .filter((entry) => entry.similarity >= MIN_SIMILARITY)
      .map<Entry>((entry) => ({
        id: entry.id,
        content: entry.content,
        source: entry.source,
        input_metadata: entry.input_metadata,
        created_at: entry.created_at,
      }));

    if (sources.length > 0) {
      answer = await synthesizeAnswer({
        question,
        retrievedEntries: sources,
      });
    }
  } catch (error) {
    console.error("POST /api/query failed during synthesis flow:", error);
    answer =
      error instanceof Error && error.message.trim()
        ? error.message
        : QUERY_FAILURE_MESSAGE;
    sources = [];
    turnState = "error";
  }

  let assistantMessage: ChatMessageInsertRow;

  try {
    assistantMessage = await insertMessage({
      content: answer,
      role: "assistant",
      status: turnState,
      threadId: thread.id,
      userId: user.id,
    });

    await insertMessageSources(assistantMessage.id, sources);
    thread = await getThreadSummary(thread.id, user.id);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to save answer.",
      500,
    );
  }

  const response: QueryResponse = {
    answer,
    sources,
    thread,
    turn: buildChatTurn({
      answer,
      createdAt: userMessage.created_at,
      id: assistantMessage.id,
      question,
      sources,
      state: assistantMessage.status,
    }),
  };

  return NextResponse.json(response);
}
