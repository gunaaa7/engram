export type EntryInputMetadata = Record<string, unknown> | null;

export type Entry = {
  id: string;
  content: string;
  source: string;
  input_metadata: EntryInputMetadata;
  created_at: string;
};

export type EntryMatch = Entry & {
  similarity: number;
};

export type ChatTurnState = "loading" | "complete" | "error";

export type ChatTurn = {
  id: string;
  answer: string;
  createdAt: string;
  question: string;
  sources: Entry[];
  state: ChatTurnState;
};

export type ChatThreadSummary = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type ChatThread = ChatThreadSummary & {
  turns: ChatTurn[];
};

export type QueryResponse = {
  answer: string;
  sources: Entry[];
  thread: ChatThreadSummary;
  turn: ChatTurn;
};
