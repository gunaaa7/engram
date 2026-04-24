"use client";

import { useActionState, useState } from "react";

import { login, signup, type LoginFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const INITIAL_STATE: LoginFormState = {};

export function LoginForm({
  allowPublicSignup,
}: {
  allowPublicSignup: boolean;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginState, loginAction, loginPending] = useActionState(
    login,
    INITIAL_STATE,
  );
  const [signupState, signupAction, signupPending] = useActionState(
    signup,
    INITIAL_STATE,
  );
  const state = mode === "login" ? loginState : signupState;
  const formAction = mode === "login" ? loginAction : signupAction;
  const pending = mode === "login" ? loginPending : signupPending;

  return (
    <div className="mt-8">
      <div
        className={`grid rounded-full border border-[var(--border)] bg-[var(--surface)]/60 p-1 ${allowPublicSignup ? "grid-cols-2" : "grid-cols-1"}`}
      >
        <button
          className={
            mode === "login"
              ? "rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-text)]"
              : "rounded-full px-4 py-2 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--text)]"
          }
          onClick={() => setMode("login")}
          type="button"
        >
          Sign in
        </button>
        {allowPublicSignup ? (
          <button
            className={
              mode === "signup"
                ? "rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-text)]"
                : "rounded-full px-4 py-2 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--text)]"
            }
            onClick={() => setMode("signup")}
            type="button"
          >
            Create account
          </button>
        ) : null}
      </div>

      <form action={formAction} className="mt-5 space-y-4">
        <div>
          <label
            className="mb-2 block text-sm font-medium text-[var(--text-soft)]"
            htmlFor={`${mode}-email`}
          >
            Email
          </label>
          <Input
            autoComplete="email"
            autoFocus
            defaultValue={state.email ?? ""}
            id={`${mode}-email`}
            name="email"
            placeholder="you@example.com"
            type="email"
          />
          {state.fieldErrors?.email ? (
            <p className="mt-2 text-sm text-[var(--danger)]">
              {state.fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium text-[var(--text-soft)]"
            htmlFor={`${mode}-password`}
          >
            Password
          </label>
          <Input
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            id={`${mode}-password`}
            name="password"
            placeholder={
              mode === "login" ? "Enter your password" : "Create a password"
            }
            type="password"
          />
          {state.fieldErrors?.password ? (
            <p className="mt-2 text-sm text-[var(--danger)]">
              {state.fieldErrors.password}
            </p>
          ) : null}
        </div>

        {allowPublicSignup && mode === "signup" ? (
          <div>
            <label
              className="mb-2 block text-sm font-medium text-[var(--text-soft)]"
              htmlFor="signup-confirm-password"
            >
              Confirm password
            </label>
            <Input
              autoComplete="new-password"
              id="signup-confirm-password"
              name="confirmPassword"
              placeholder="Repeat your password"
              type="password"
            />
            {state.fieldErrors?.confirmPassword ? (
              <p className="mt-2 text-sm text-[var(--danger)]">
                {state.fieldErrors.confirmPassword}
              </p>
            ) : null}
          </div>
        ) : null}

        {state.error ? (
          <p className="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger)]">
            {state.error}
          </p>
        ) : null}

        {state.message ? (
          <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-soft)]">
            {state.message}
          </p>
        ) : null}

        <Button className="h-12 w-full" disabled={pending} type="submit">
          {mode === "login"
            ? pending
              ? "Signing in..."
              : "Sign in"
            : pending
              ? "Creating account..."
              : "Create account"}
        </Button>
      </form>
    </div>
  );
}
