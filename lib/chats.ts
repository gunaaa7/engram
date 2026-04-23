import type { Entry, ChatThread, ChatThreadSummary, ChatTurn } from "@/lib/types";

type ChatRole = "user" | "assistant";
type PersistedChatTurnState = Exclude<ChatTurn["state"], "loading">;

type ChatThreadRow = ChatThreadSummary;

type ChatMessageRow = {
  content: string;
  created_at: string;
  id: string;
  role: ChatRole;
  status: PersistedChatTurnState;
  thread_id: string;
};

type ChatMessageSourceRow = {
  entry_id: string;
  message_id: string;
};

export function buildThreadTitle(question: string) {
  const normalizedQuestion = question.trim();

  if (normalizedQuestion.length <= 44) {
    return normalizedQuestion;
  }

  return `${normalizedQuestion.slice(0, 41)}...`;
}

export function buildChatTurn(input: {
  answer: string;
  createdAt: string;
  id: string;
  question: string;
  sources: Entry[];
  state: PersistedChatTurnState;
}): ChatTurn {
  return {
    answer: input.answer,
    createdAt: input.createdAt,
    id: input.id,
    question: input.question,
    sources: input.sources,
    state: input.state,
  };
}

export function assembleChatThreads(input: {
  entries: Entry[];
  messages: ChatMessageRow[];
  sourceLinks: ChatMessageSourceRow[];
  threads: ChatThreadRow[];
}): ChatThread[] {
  const entryById = new Map(input.entries.map((entry) => [entry.id, entry]));
  const sourceIdsByMessageId = new Map<string, string[]>();

  for (const sourceLink of input.sourceLinks) {
    const currentEntryIds =
      sourceIdsByMessageId.get(sourceLink.message_id) ?? [];

    currentEntryIds.push(sourceLink.entry_id);
    sourceIdsByMessageId.set(sourceLink.message_id, currentEntryIds);
  }

  const messagesByThreadId = new Map<string, ChatMessageRow[]>();

  for (const message of input.messages) {
    const currentMessages = messagesByThreadId.get(message.thread_id) ?? [];

    currentMessages.push(message);
    messagesByThreadId.set(message.thread_id, currentMessages);
  }

  return input.threads.map((thread) => {
    const turns: ChatTurn[] = [];
    let pendingQuestionMessage: ChatMessageRow | null = null;

    for (const message of messagesByThreadId.get(thread.id) ?? []) {
      if (message.role === "user") {
        pendingQuestionMessage = message;
        continue;
      }

      if (!pendingQuestionMessage) {
        continue;
      }

      const sources = (sourceIdsByMessageId.get(message.id) ?? [])
        .map((entryId) => entryById.get(entryId) ?? null)
        .filter((entry): entry is Entry => entry != null);

      turns.push(
        buildChatTurn({
          answer: message.content,
          createdAt: pendingQuestionMessage.created_at,
          id: message.id,
          question: pendingQuestionMessage.content,
          sources,
          state: message.status,
        }),
      );

      pendingQuestionMessage = null;
    }

    if (pendingQuestionMessage) {
      turns.push({
        answer: "This reply did not finish. Ask again to regenerate it.",
        createdAt: pendingQuestionMessage.created_at,
        id: pendingQuestionMessage.id,
        question: pendingQuestionMessage.content,
        sources: [],
        state: "error",
      });
    }

    return {
      ...thread,
      turns,
    };
  });
}
