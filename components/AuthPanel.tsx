import { LoginForm } from "@/components/LoginForm";
import { playfairDisplay } from "@/lib/fonts";

export function AuthPanel() {
  return (
    <section className="landing-auth-theme w-full rounded-[2.4rem] border border-[var(--shell-border)] bg-[var(--shell-bg)] p-6 shadow-[var(--shadow-strong)] backdrop-blur-2xl sm:p-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
          Engram
        </p>
        <h1
          className={`${playfairDisplay.className} mt-4 text-4xl font-bold leading-[1.02] tracking-[-0.05em] text-[var(--text)] sm:text-[3.2rem]`}
        >
          Your memory, one sign-in away.
        </h1>
        <p className="mt-4 max-w-sm text-sm leading-7 text-[var(--muted)]">
          Sign in to continue, or create an account to start saving memories.
        </p>
      </div>

      <LoginForm />
    </section>
  );
}
