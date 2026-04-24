import { redirect } from "next/navigation";

import { LoginForm } from "@/components/LoginForm";
import { getAuthenticatedUser } from "@/lib/supabaseAuthServer";

export default async function LoginPage() {
  const user = await getAuthenticatedUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="engram-theme flex min-h-[100dvh] flex-1 items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-[2.4rem] border border-[var(--shell-border)] bg-[var(--shell-bg)] p-6 shadow-[var(--shadow-strong)] backdrop-blur-2xl sm:p-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
            Engram
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-[var(--text)]">
            Your memory, one sign-in away.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Sign in to continue, or create an account to start saving memories.
          </p>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}
