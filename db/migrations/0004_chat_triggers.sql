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
