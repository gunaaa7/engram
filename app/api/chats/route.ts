import { NextResponse } from "next/server";

import { assembleChatThreads } from "@/lib/chats";
import { jsonError } from "@/lib/http";
import { createServiceSupabaseClient } from "@/lib/supabase";
import type { Entry } from "@/lib/types";

export const runtime = "nodejs";

type ChatThreadRow = {
  created_at: string;
  id: string;
  title: string;
  updated_at: string;
};

type ChatMessageRow = {
  content: string;
  created_at: string;
  id: string;
  role: "user" | "assistant";
  status: "complete" | "error";
  thread_id: string;
};

type ChatMessageSourceRow = {
  entry_id: string;
  message_id: string;
};

export async function GET() {
  const supabase = createServiceSupabaseClient();

  const [{ data: threads, error: threadsError }, { data: messages, error: messagesError }, { data: sourceLinks, error: sourceLinksError }] =
    await Promise.all([
      supabase
        .from("chat_threads")
        .select("id, title, created_at, updated_at")
        .order("updated_at", { ascending: false }),
      supabase
        .from("chat_messages")
        .select("id, thread_id, role, content, status, created_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("chat_message_sources")
        .select("message_id, entry_id"),
    ]);

  if (threadsError) {
    console.error("GET /api/chats failed to read threads:", threadsError);
    return jsonError("Failed to read chats.", 500);
  }

  if (messagesError) {
    console.error("GET /api/chats failed to read messages:", messagesError);
    return jsonError("Failed to read chats.", 500);
  }

  if (sourceLinksError) {
    console.error(
      "GET /api/chats failed to read message sources:",
      sourceLinksError,
    );
    return jsonError("Failed to read chats.", 500);
  }

  const entryIds = Array.from(
    new Set((sourceLinks ?? []).map((sourceLink) => sourceLink.entry_id)),
  );

  let entries: Entry[] = [];

  if (entryIds.length > 0) {
    const { data, error } = await supabase
      .from("entries")
      .select("id, content, source, input_metadata, created_at")
      .in("id", entryIds);

    if (error) {
      console.error("GET /api/chats failed to read source entries:", error);
      return jsonError("Failed to read chats.", 500);
    }

    entries = (data ?? []) as Entry[];
  }

  const chats = assembleChatThreads({
    entries,
    messages: (messages ?? []) as ChatMessageRow[],
    sourceLinks: (sourceLinks ?? []) as ChatMessageSourceRow[],
    threads: (threads ?? []) as ChatThreadRow[],
  });

  return NextResponse.json(chats);
}
