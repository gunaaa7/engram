import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

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

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function getServerSupabaseKey() {
  return (
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

async function findUserByEmail(supabase, ownerEmail) {
  const normalizedOwnerEmail = ownerEmail.toLowerCase();
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw error;
    }

    const user = data.users.find((candidate) => {
      return candidate.email?.toLowerCase() === normalizedOwnerEmail;
    });

    if (user) {
      return user;
    }

    if (data.users.length < 1000) {
      return null;
    }

    page += 1;
  }
}

async function backfillTable(supabase, tableName, ownerUserId) {
  const { count, error } = await supabase
    .from(tableName)
    .update({ user_id: ownerUserId }, { count: "exact" })
    .is("user_id", null)
    .select("id", { count: "exact", head: true });

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function main() {
  loadLocalEnv();

  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serverKey = getServerSupabaseKey();
  const ownerEmail = getRequiredEnv("OWNER_EMAIL");

  if (!serverKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is not configured.",
    );
  }

  const supabase = createClient(supabaseUrl, serverKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const owner = await findUserByEmail(supabase, ownerEmail);

  if (!owner) {
    throw new Error(`No Supabase Auth user found for OWNER_EMAIL=${ownerEmail}.`);
  }

  console.log(`Backfilling existing Engram rows to ${owner.email} (${owner.id}).`);

  for (const tableName of ["entries", "chat_threads", "chat_messages"]) {
    const count = await backfillTable(supabase, tableName, owner.id);
    console.log(`${tableName}: ${count} rows updated.`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
