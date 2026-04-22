import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_EMBEDDING_PROVIDER = "openai";
const DEFAULT_SYNTHESIS_PROVIDER = "google";
const DEFAULT_GOOGLE_SYNTHESIS_MODEL = "gemini-2.5-flash";
const DEFAULT_OPENAI_SYNTHESIS_MODEL = "gpt-4o-mini";
const DEFAULT_SYNTHESIS_TEMPERATURE = 0.2;
const DEFAULT_GOOGLE_THINKING_BUDGET = -1;
const DEFAULT_MATCH_COUNT = 5;
const DEFAULT_MIN_SIMILARITY = 0.2;
const DEFAULT_API_URL = "http://localhost:3000/api/query";

const SYNTHESIS_SYSTEM_PROMPT = `You are a personal memory assistant for a specific user.
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

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const contents = fs.readFileSync(filePath, "utf8");

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    const inlineCommentIndex = value.indexOf(" #");
    if (inlineCommentIndex >= 0) {
      value = value.slice(0, inlineCommentIndex).trim();
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function loadLocalEnv() {
  const cwd = process.cwd();
  loadEnvFile(path.join(cwd, ".env"));
  loadEnvFile(path.join(cwd, ".env.local"));
}

function parseArgs(argv) {
  const options = {
    apiUrl: DEFAULT_API_URL,
    callApi: true,
    matchCount: DEFAULT_MATCH_COUNT,
    minSimilarity: DEFAULT_MIN_SIMILARITY,
    query: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--no-api") {
      options.callApi = false;
      continue;
    }

    if (arg === "--api-url") {
      options.apiUrl = argv[index + 1] ?? DEFAULT_API_URL;
      index += 1;
      continue;
    }

    if (arg === "--match-count") {
      options.matchCount = Number(argv[index + 1] ?? DEFAULT_MATCH_COUNT);
      index += 1;
      continue;
    }

    if (arg === "--min-similarity") {
      options.minSimilarity = Number(
        argv[index + 1] ?? DEFAULT_MIN_SIMILARITY,
      );
      index += 1;
      continue;
    }

    if (!options.query) {
      options.query = arg;
      continue;
    }
  }

  return options;
}

function getEmbeddingProvider() {
  return (
    process.env.EMBEDDING_PROVIDER?.trim().toLowerCase() ??
    DEFAULT_EMBEDDING_PROVIDER
  );
}

function getSynthesisProvider() {
  return (
    process.env.SYNTHESIS_PROVIDER?.trim().toLowerCase() ??
    DEFAULT_SYNTHESIS_PROVIDER
  );
}

function getSynthesisModel(provider) {
  const configured = process.env.SYNTHESIS_MODEL?.trim();
  if (configured) {
    return configured;
  }

  return provider === "openai"
    ? DEFAULT_OPENAI_SYNTHESIS_MODEL
    : DEFAULT_GOOGLE_SYNTHESIS_MODEL;
}

function getSynthesisTemperature() {
  const value = Number(process.env.SYNTHESIS_TEMPERATURE);
  return Number.isFinite(value) ? value : DEFAULT_SYNTHESIS_TEMPERATURE;
}

function getGoogleThinkingBudget() {
  const value = Number(process.env.GOOGLE_SYNTHESIS_THINKING_BUDGET);
  return Number.isInteger(value) ? value : DEFAULT_GOOGLE_THINKING_BUDGET;
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

function getOpenAIClient() {
  return new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
}

function getGoogleAIClient() {
  return new GoogleGenAI({ apiKey: requireEnv("GOOGLE_AI_API_KEY") });
}

function getSupabaseClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    process.env.SUPABASE_SECRET_KEY?.trim() ||
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

async function embedText(text, purpose) {
  const provider = getEmbeddingProvider();
  const input = text.trim();

  if (!input) {
    throw new Error("Query text is required.");
  }

  if (provider === "google") {
    const response = await getGoogleAIClient().models.embedContent({
      model: "gemini-embedding-001",
      contents: input,
      config: {
        outputDimensionality: 768,
        taskType:
          purpose === "document" ? "RETRIEVAL_DOCUMENT" : "RETRIEVAL_QUERY",
      },
    });

    const embedding = response.embeddings?.[0]?.values;

    if (!embedding) {
      throw new Error("Google returned an empty embedding.");
    }

    return embedding;
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

function parseVector(value) {
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
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function cosineSimilarity(a, b) {
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

function formatPromptDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function buildSynthesisUserMessage(question, entries) {
  const formattedEntries = entries
    .map((entry) => `[${formatPromptDate(entry.created_at)}]: ${entry.content}`)
    .join("\n\n");

  return `
Question: ${question}

Relevant entries from my memory:
${formattedEntries}
`;
}

async function synthesizeAnswer(question, entries) {
  const provider = getSynthesisProvider();
  const model = getSynthesisModel(provider);
  const temperature = getSynthesisTemperature();

  if (provider === "openai") {
    const completion = await getOpenAIClient().chat.completions.create({
      model,
      temperature,
      messages: [
        { role: "system", content: SYNTHESIS_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildSynthesisUserMessage(question, entries),
        },
      ],
    });

    const answer = completion.choices[0]?.message?.content?.trim();
    if (!answer) {
      throw new Error("OpenAI returned an empty answer.");
    }

    return answer;
  }

  const response = await getGoogleAIClient().models.generateContent({
    model,
    contents: buildSynthesisUserMessage(question, entries),
    config: {
      temperature,
      systemInstruction: SYNTHESIS_SYSTEM_PROMPT,
      thinkingConfig: {
        thinkingBudget: getGoogleThinkingBudget(),
      },
    },
  });

  const answer = response.text?.trim();

  if (!answer) {
    throw new Error("Google returned an empty answer.");
  }

  return answer;
}

async function tryLocalApi(apiUrl, query) {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question: query }),
  });

  const rawBody = await response.text();

  let parsedBody = null;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    parsedBody = rawBody;
  }

  return {
    ok: response.ok,
    status: response.status,
    body: parsedBody,
  };
}

async function runStep(title, fn) {
  const startedAt = Date.now();
  process.stdout.write(`\n[STEP] ${title}\n`);

  try {
    const result = await fn();
    const elapsed = Date.now() - startedAt;
    process.stdout.write(`[OK] ${title} (${elapsed}ms)\n`);
    return { ok: true, result };
  } catch (error) {
    const elapsed = Date.now() - startedAt;
    process.stdout.write(`[FAIL] ${title} (${elapsed}ms)\n`);
    process.stdout.write(`${error.stack ?? error.message ?? String(error)}\n`);
    return { ok: false, error };
  }
}

function printJson(label, value) {
  process.stdout.write(`${label}\n`);
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function summarizeMatches(matches) {
  return matches.map((entry) => ({
    similarity: Number(entry.similarity.toFixed(4)),
    created_at: entry.created_at,
    content: entry.content,
  }));
}

async function main() {
  loadLocalEnv();

  const options = parseArgs(process.argv.slice(2));

  if (!options.query) {
    process.stderr.write(
      "Usage: npm run debug:query -- \"your question here\" [--no-api] [--api-url http://localhost:3000/api/query]\n",
    );
    process.exit(1);
  }

  const synthesisProvider = getSynthesisProvider();
  const synthesisModel = getSynthesisModel(synthesisProvider);

  printJson("Debug configuration:", {
    query: options.query,
    embeddingProvider: getEmbeddingProvider(),
    synthesisProvider,
    synthesisModel,
    synthesisTemperature: getSynthesisTemperature(),
    googleThinkingBudget:
      synthesisProvider === "google" ? getGoogleThinkingBudget() : null,
    matchCount: options.matchCount,
    minSimilarity: options.minSimilarity,
    callApi: options.callApi,
    apiUrl: options.callApi ? options.apiUrl : null,
  });

  const embeddingStep = await runStep("Generate query embedding", async () => {
    const embedding = await embedText(options.query, "query");
    printJson("Query embedding summary:", {
      dimensions: embedding.length,
      preview: embedding.slice(0, 8),
    });
    return embedding;
  });

  if (!embeddingStep.ok) {
    process.exit(1);
  }

  const queryEmbedding = embeddingStep.result;
  const supabase = getSupabaseClient();

  const entriesStep = await runStep("Load entries from Supabase", async () => {
    const { data, error } = await supabase
      .from("entries")
      .select("id, content, source, input_metadata, created_at, embedding")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const entries = data ?? [];
    const parsedVectors = entries.map((entry) => parseVector(entry.embedding));
    const dimensions = [
      ...new Set(parsedVectors.filter(Boolean).map((vector) => vector.length)),
    ];

    printJson("Entry corpus summary:", {
      entryCount: entries.length,
      entriesWithEmbedding: parsedVectors.filter(Boolean).length,
      uniqueEmbeddingDimensions: dimensions,
      latestEntries: entries.slice(0, 5).map((entry) => ({
        created_at: entry.created_at,
        content: entry.content,
      })),
    });

    return entries;
  });

  if (!entriesStep.ok) {
    process.exit(1);
  }

  const entries = entriesStep.result;

  await runStep("Call match_entries RPC", async () => {
    const { data, error } = await supabase.rpc("match_entries", {
      query_embedding: queryEmbedding,
      match_count: options.matchCount,
    });

    if (error) {
      throw error;
    }

    const matches = data ?? [];
    printJson("RPC matches:", {
      count: matches.length,
      matches: summarizeMatches(matches),
    });

    const filtered = matches.filter(
      (entry) => entry.similarity >= options.minSimilarity,
    );

    printJson("RPC matches above threshold:", {
      threshold: options.minSimilarity,
      count: filtered.length,
      matches: summarizeMatches(filtered),
    });

    return matches;
  });

  const localRankingStep = await runStep(
    "Compute local cosine similarities from stored embeddings",
    async () => {
      const ranked = entries
        .map((entry) => {
          const vector = parseVector(entry.embedding);
          if (!vector) {
            return null;
          }

          return {
            id: entry.id,
            content: entry.content,
            source: entry.source,
            input_metadata: entry.input_metadata,
            created_at: entry.created_at,
            similarity: cosineSimilarity(queryEmbedding, vector),
          };
        })
        .filter(Boolean)
        .sort((left, right) => right.similarity - left.similarity);

      printJson("Local similarity ranking:", {
        count: ranked.length,
        matches: summarizeMatches(ranked.slice(0, options.matchCount)),
      });

      const filtered = ranked.filter(
        (entry) => entry.similarity >= options.minSimilarity,
      );

      printJson("Local matches above threshold:", {
        threshold: options.minSimilarity,
        count: filtered.length,
        matches: summarizeMatches(filtered.slice(0, options.matchCount)),
      });

      if (
        filtered.length > 0 &&
        entries.some((entry) => parseVector(entry.embedding)?.length !== queryEmbedding.length)
      ) {
        process.stdout.write(
          "[WARN] Some stored embeddings have a different dimensionality than the query embedding.\n",
        );
      }

      return ranked;
    },
  );

  if (!localRankingStep.ok) {
    process.exit(1);
  }

  const effectiveMatches = localRankingStep.result
    .filter((entry) => entry.similarity >= options.minSimilarity)
    .slice(0, options.matchCount)
    .map(({ id, content, source, input_metadata, created_at }) => ({
      id,
      content,
      source,
      input_metadata,
      created_at,
    }));

  if (effectiveMatches.length === 0) {
    process.stdout.write(
      "\n[RESULT] No local matches survived the threshold, so synthesis would correctly return the no-relevant-entries message.\n",
    );
  } else {
    await runStep("Run synthesis on effective matches", async () => {
      const answer = await synthesizeAnswer(options.query, effectiveMatches);
      printJson("Synthesized answer:", {
        answer,
        sourceCount: effectiveMatches.length,
      });
      return answer;
    });
  }

  if (options.callApi) {
    await runStep("Call local /api/query route", async () => {
      const response = await tryLocalApi(options.apiUrl, options.query);
      printJson("Local API response:", response);
      return response;
    });
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message ?? String(error)}\n`);
  process.exit(1);
});
