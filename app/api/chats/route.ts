import { NextResponse } from "next/server";

import { assembleChatThreads } from "@/lib/chats";
import { jsonError } from "@/lib/http";
import { createServiceSupabaseClient } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/supabaseAuthServer";
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
  const user = await getAuthenticatedUser();

  if (!user) {
    return jsonError("Authentication required.", 401);
  }

  const supabase = createServiceSupabaseClient();

  const [{ data: threads, error: threadsError }, { data: messages, error: messagesError }] =
    await Promise.all([
      supabase
        .from("chat_threads")
        .select("id, title, created_at, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("chat_messages")
        .select("id, thread_id, role, content, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
    ]);

  if (threadsError) {
    console.error("GET /api/chats failed to read threads:", threadsError);
    return jsonError("Failed to read chats.", 500);
  }

  if (messagesError) {
    console.error("GET /api/chats failed to read messages:", messagesError);
    return jsonError("Failed to read chats.", 500);
  }

  const messageIds = (messages ?? []).map((message) => message.id);
  let sourceLinks: ChatMessageSourceRow[] = [];

  if (messageIds.length > 0) {
    const { data, error } = await supabase
      .from("chat_message_sources")
      .select("message_id, entry_id")
      .in("message_id", messageIds);

    if (error) {
      console.error(
        "GET /api/chats failed to read message sources:",
        error,
      );
      return jsonError("Failed to read chats.", 500);
    }

    sourceLinks = (data ?? []) as ChatMessageSourceRow[];
  }

  const entryIds = Array.from(
    new Set(sourceLinks.map((sourceLink) => sourceLink.entry_id)),
  );

  let entries: Entry[] = [];

  if (entryIds.length > 0) {
    const { data, error } = await supabase
      .from("entries")
      .select("id, content, source, input_metadata, created_at")
      .eq("user_id", user.id)
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
    sourceLinks,
    threads: (threads ?? []) as ChatThreadRow[],
  });

  return NextResponse.json(chats);
}
