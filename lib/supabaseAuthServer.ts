import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getSupabasePublicKey } from "@/lib/supabase";

function getRequiredEnv(name: keyof NodeJS.ProcessEnv) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export async function createServerAuthClient() {
  const cookieStore = await cookies();

  return createServerClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getSupabasePublicKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, options, value }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot write cookies. The proxy refreshes them.
          }
        },
      },
    },
  );
}

export async function getAuthenticatedUser() {
  const supabase = await createServerAuthClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export const requireAuthenticatedUser = cache(async () => {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/?auth=1");
  }

  return user;
});
