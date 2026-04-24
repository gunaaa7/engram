"use client";

import { createBrowserClient } from "@supabase/ssr";

function getRequiredPublicEnv(name: keyof NodeJS.ProcessEnv) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function getPublicSupabaseKey() {
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const value = publishableKey || anonKey;

  if (!value) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured.",
    );
  }

  return value;
}

export function createBrowserAuthClient() {
  return createBrowserClient(
    getRequiredPublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getPublicSupabaseKey(),
  );
}
