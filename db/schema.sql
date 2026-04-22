create extension if not exists vector;
create extension if not exists pgcrypto;

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
  match_count int default 5
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
  order by e.embedding <=> q.embedding
  limit greatest(match_count, 1);
$$;
