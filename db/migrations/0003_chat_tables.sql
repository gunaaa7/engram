create table if not exists chat_threads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id text
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references chat_threads(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  status text not null default 'complete' check (status in ('complete', 'error')),
  created_at timestamptz not null default now(),
  user_id text
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

alter table if exists chat_threads
  enable row level security;

alter table if exists chat_messages
  enable row level security;

alter table if exists chat_message_sources
  enable row level security;
