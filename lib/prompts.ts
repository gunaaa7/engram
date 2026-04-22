import type { Entry } from "@/lib/types";
import { formatPromptDate } from "@/lib/utils";

export const NO_RELEVANT_MESSAGE = `I did not find anything relevant in your captures.
Try adding more context or rephrasing your question.`;

export const SYNTHESIS_SYSTEM_PROMPT = `You are a personal memory assistant for a specific user.
Your only job is to answer their questions based on entries they have
captured in their memory store.

Rules:
1. Answer only from the provided entries. Do not infer or make up
   information not explicitly in the entries.
2. If no entries are relevant, respond exactly with:
   "I did not find anything relevant in your captures.
    Try adding more context or rephrasing your question."
3. Be direct and concise. Do not repeat entry content verbatim
   unless quoting is essential.
4. Reference which entries you drew from, using their dates:
   e.g. "Based on your entry from April 15..."
5. If multiple entries are relevant, synthesize across them.
   Do not list them - give a unified answer.`;

export function buildSynthesisUserMessage(
  userQuestion: string,
  retrievedEntries: Entry[],
) {
  const formattedEntries = retrievedEntries
    .map((entry) => `[${formatPromptDate(entry.created_at)}]: ${entry.content}`)
    .join("\n\n");

  return `
Question: ${userQuestion}

Relevant entries from my memory:
${formattedEntries}
`;
}
