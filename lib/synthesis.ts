import "server-only";

import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

import {
  buildSynthesisUserMessage,
  SYNTHESIS_SYSTEM_PROMPT,
} from "@/lib/prompts";
import type { Entry } from "@/lib/types";

type SynthesisProvider = "google" | "openai";

type SynthesisInput = {
  question: string;
  retrievedEntries: Entry[];
};

const DEFAULT_SYNTHESIS_PROVIDER: SynthesisProvider = "google";
const DEFAULT_GOOGLE_SYNTHESIS_MODEL = "gemini-2.5-flash";
const DEFAULT_OPENAI_SYNTHESIS_MODEL = "gpt-4o-mini";
const DEFAULT_SYNTHESIS_TEMPERATURE = 0.2;
const DEFAULT_GOOGLE_THINKING_BUDGET = -1;

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

function getSynthesisProvider(): SynthesisProvider {
  const provider = process.env.SYNTHESIS_PROVIDER?.trim().toLowerCase();

  if (provider === "openai") {
    return "openai";
  }

  return DEFAULT_SYNTHESIS_PROVIDER;
}

function getSynthesisModel(provider: SynthesisProvider) {
  const configuredModel = process.env.SYNTHESIS_MODEL?.trim();

  if (configuredModel) {
    return configuredModel;
  }

  return provider === "openai"
    ? DEFAULT_OPENAI_SYNTHESIS_MODEL
    : DEFAULT_GOOGLE_SYNTHESIS_MODEL;
}

function getSynthesisTemperature() {
  const value = Number(process.env.SYNTHESIS_TEMPERATURE);

  if (Number.isFinite(value)) {
    return value;
  }

  return DEFAULT_SYNTHESIS_TEMPERATURE;
}

function getGoogleThinkingBudget() {
  const value = Number(process.env.GOOGLE_SYNTHESIS_THINKING_BUDGET);

  if (Number.isInteger(value)) {
    return value;
  }

  return DEFAULT_GOOGLE_THINKING_BUDGET;
}

async function synthesizeWithOpenAI(
  input: SynthesisInput,
  model: string,
  temperature: number,
) {
  const completion = await getOpenAIClient().chat.completions.create({
    model,
    temperature,
    messages: [
      {
        role: "system",
        content: SYNTHESIS_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: buildSynthesisUserMessage(
          input.question,
          input.retrievedEntries,
        ),
      },
    ],
  });

  const answer = completion.choices[0]?.message?.content?.trim();

  if (!answer) {
    throw new Error("OpenAI returned an empty answer.");
  }

  return answer;
}

async function synthesizeWithGoogle(
  input: SynthesisInput,
  model: string,
  temperature: number,
) {
  const response = await getGoogleAIClient().models.generateContent({
    model,
    contents: buildSynthesisUserMessage(input.question, input.retrievedEntries),
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

export async function synthesizeAnswer(input: SynthesisInput) {
  const provider = getSynthesisProvider();
  const model = getSynthesisModel(provider);
  const temperature = getSynthesisTemperature();

  if (provider === "openai") {
    return synthesizeWithOpenAI(input, model, temperature);
  }

  return synthesizeWithGoogle(input, model, temperature);
}
