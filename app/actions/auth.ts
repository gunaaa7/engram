"use server";

import { redirect } from "next/navigation";

import { createServerAuthClient } from "@/lib/supabaseAuthServer";

export type LoginFormState = {
  email?: string;
  error?: string;
  message?: string;
  fieldErrors?: {
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
};

function parseCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  return {
    email,
    password,
  };
}

function validateEmailAndPassword(input: {
  email: string;
  password: string;
}) {
  const fieldErrors: LoginFormState["fieldErrors"] = {};

  if (!input.email) {
    fieldErrors.email = "Email is required.";
  }

  if (!input.password) {
    fieldErrors.password = "Password is required.";
  } else if (input.password.length < 8) {
    fieldErrors.password = "Password must be at least 8 characters.";
  }

  return fieldErrors;
}

export async function login(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const { email, password } = parseCredentials(formData);
  const fieldErrors = validateEmailAndPassword({
    email,
    password,
  });

  if (Object.keys(fieldErrors).length > 0) {
    return {
      email,
      fieldErrors,
    };
  }

  const supabase = await createServerAuthClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      email,
      error: "Invalid email or password.",
    };
  }

  redirect("/memory");
}

export async function signup(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const { email, password } = parseCredentials(formData);
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const fieldErrors = validateEmailAndPassword({
    email,
    password,
  });

  if (!confirmPassword) {
    fieldErrors.confirmPassword = "Please confirm your password.";
  } else if (confirmPassword !== password) {
    fieldErrors.confirmPassword = "Passwords do not match.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      email,
      fieldErrors,
    };
  }

  const supabase = await createServerAuthClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return {
      email,
      error: error.message,
    };
  }

  if (data.session) {
    redirect("/memory");
  }

  return {
    email,
    message: "Account created. Check your email to confirm your account, then sign in.",
  };
}

export async function logout() {
  const supabase = await createServerAuthClient();
  await supabase.auth.signOut();
  redirect("/");
}
