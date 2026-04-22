import "server-only";

import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

export type EmbeddingPurpose = "document" | "query";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({ apiKey });
}

function getGoogleAIClient() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is not configured.");
  }

  return new GoogleGenAI({ apiKey });
}

async function embedWithOpenAI(text: string): Promise<number[]> {
  const input = text.trim();

  if (!input) {
    throw new Error("Text is required for embedding.");
  }

  const response = await getOpenAIClient().embeddings.create({
    model: "text-embedding-3-small",
    input,
  });

  const embedding = response.data[0]?.embedding;

  if (!embedding) {
    throw new Error("OpenAI returned an empty embedding.");
  }

  return embedding;
}

async function embedWithGoogle(
  text: string,
  purpose: EmbeddingPurpose,
): Promise<number[]> {
  const input = text.trim();

  if (!input) {
    throw new Error("Text is required for embedding.");
  }

  const response = await getGoogleAIClient()
    .models.embedContent({
      model: "gemini-embedding-001",
      contents: input,
      config: {
        outputDimensionality: 768,
        taskType:
          purpose === "document"
            ? "RETRIEVAL_DOCUMENT"
            : "RETRIEVAL_QUERY",
      },
    });

  const embedding = response.embeddings?.[0]?.values;

  if (!embedding) {
    throw new Error("Google returned an empty embedding.");
  }

  return embedding;
}

export async function embed(
  text: string,
  purpose: EmbeddingPurpose,
): Promise<number[]> {
  const provider = process.env.EMBEDDING_PROVIDER?.trim().toLowerCase();

  if (provider === "google") {
    return embedWithGoogle(text, purpose);
  }

  return embedWithOpenAI(text);
}
