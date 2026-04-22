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

export type QueryResponse = {
  answer: string;
  sources: Entry[];
};
