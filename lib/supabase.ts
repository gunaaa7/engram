import { createClient } from "@supabase/supabase-js";

function getRequiredEnv(name: keyof NodeJS.ProcessEnv) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export function getSupabasePublicKey() {
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

function getServerSupabaseKey() {
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const value = secretKey || serviceRoleKey;

  if (!value) {
    throw new Error(
      "SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is not configured.",
    );
  }

  return value;
}

export function createBrowserSupabaseClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getSupabasePublicKey(),
  );
}

export function createServiceSupabaseClient() {
  if (typeof window !== "undefined") {
    throw new Error("Service role Supabase client cannot run in the browser.");
  }

  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getServerSupabaseKey(),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
