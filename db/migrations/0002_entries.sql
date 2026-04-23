create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  source text not null default 'text',
  input_metadata jsonb,
  -- Change to vector(1536) and update EMBEDDING_PROVIDER to switch back to OpenAI
  embedding vector(768),
  created_at timestamptz not null default now(),
  user_id text
);

alter table if exists entries
  add column if not exists source text not null default 'text';

alter table if exists entries
  add column if not exists input_metadata jsonb;

-- Lock the table behind RLS from day one. In v1, browser clients do not
-- access Supabase directly; all reads/writes go through server-side API
-- routes using the service-role key, so no anon/authenticated policies are
-- created yet.
alter table if exists entries
  enable row level security;
