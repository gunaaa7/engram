-- Snapshot of the current database schema.
-- Preferred workflow:
-- 1. Add new changes as ordered files under db/migrations/
-- 2. Apply migrations in order
-- 3. Keep this snapshot in sync for fresh bootstrap/reference use

-- 0001_extensions.sql
create extension if not exists vector;
create extension if not exists pgcrypto;

-- 0002_entries.sql
create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  source text not null default 'text',
  input_metadata jsonb,
  -- Change to vector(1536) and update EMBEDDING_PROVIDER to switch back to OpenAI
  embedding vector(768),
  created_at timestamptz not null default now(),
  user_id uuid
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

-- 0003_chat_tables.sql
create table if not exists chat_threads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references chat_threads(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  status text not null default 'complete' check (status in ('complete', 'error')),
  created_at timestamptz not null default now(),
  user_id uuid
);

create table if not exists chat_message_sources (
  message_id uuid not null references chat_messages(id) on delete cascade,
  entry_id uuid not null references entries(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, entry_id)
);

create index if not exists chat_threads_updated_at_idx
  on chat_threads (updated_at desc);

create index if not exists chat_messages_thread_id_created_at_idx
  on chat_messages (thread_id, created_at);

create index if not exists chat_message_sources_message_id_idx
  on chat_message_sources (message_id);

create index if not exists entries_user_id_created_at_idx
  on entries (user_id, created_at desc);

create index if not exists chat_threads_user_id_updated_at_idx
  on chat_threads (user_id, updated_at desc);

create index if not exists chat_messages_user_id_thread_id_created_at_idx
  on chat_messages (user_id, thread_id, created_at);

alter table if exists chat_threads
  enable row level security;

alter table if exists chat_messages
  enable row level security;

alter table if exists chat_message_sources
  enable row level security;

-- 0004_chat_triggers.sql
create or replace function public.touch_chat_thread_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.sync_chat_thread_activity()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    update public.chat_threads
    set updated_at = now()
    where id = old.thread_id;

    return null;
  end if;

  update public.chat_threads
  set updated_at = now()
  where id = new.thread_id;

  return null;
end;
$$;

drop trigger if exists chat_threads_set_updated_at on public.chat_threads;
create trigger chat_threads_set_updated_at
before update on public.chat_threads
for each row
execute function public.touch_chat_thread_updated_at();

drop trigger if exists chat_messages_sync_thread_activity on public.chat_messages;
create trigger chat_messages_sync_thread_activity
after insert or update or delete on public.chat_messages
for each row
execute function public.sync_chat_thread_activity();

-- 0005_match_entries.sql
-- WARNING: Do not create an IVFFlat/HNSW vector index by default for tiny
-- local/dev datasets. Approximate ANN indexes can hurt recall badly on small
-- tables and caused `match_entries` RPC calls to return zero rows in this
-- project while exact cosine search still found strong matches.
--
-- Keep the default schema on exact search. Add an ANN index only after the
-- table has grown enough to justify it, and benchmark recall with
-- `npm run debug:query` before and after.
--
-- Example for larger datasets only:
-- create index if not exists entries_embedding_idx
--   on entries
--   using ivfflat (embedding vector_cosine_ops)
--   with (lists = 100);

create or replace function public.match_entries(
  query_embedding jsonb,
  match_count int default 5,
  owner_id uuid default null
)
returns table (
  id uuid,
  content text,
  source text,
  input_metadata jsonb,
  created_at timestamptz,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  with query as (
    select (query_embedding::text)::vector(768) as embedding
  )
  select
    e.id,
    e.content,
    e.source,
    e.input_metadata,
    e.created_at,
    1 - (e.embedding <=> q.embedding) as similarity
  from public.entries e
  cross join query q
  where e.embedding is not null
    and e.user_id = owner_id
  order by e.embedding <=> q.embedding
  limit greatest(match_count, 1);
$$;
