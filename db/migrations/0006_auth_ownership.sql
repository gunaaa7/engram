alter table if exists entries
  alter column user_id type uuid using nullif(user_id, '')::uuid;

alter table if exists chat_threads
  alter column user_id type uuid using nullif(user_id, '')::uuid;

alter table if exists chat_messages
  alter column user_id type uuid using nullif(user_id, '')::uuid;

create index if not exists entries_user_id_created_at_idx
  on entries (user_id, created_at desc);

create index if not exists chat_threads_user_id_updated_at_idx
  on chat_threads (user_id, updated_at desc);

create index if not exists chat_messages_user_id_thread_id_created_at_idx
  on chat_messages (user_id, thread_id, created_at);

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
