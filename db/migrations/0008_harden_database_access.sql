begin;

set local search_path = pg_catalog;

-- Remove obsolete overloads left behind when the owner argument was added.
do $$
declare
  overload regprocedure;
begin
  for overload in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'match_entries'
      and p.prokind = 'f'
      and p.oid <> 'public.match_entries(jsonb, integer, uuid)'::regprocedure
  loop
    execute format('drop function %s', overload);
  end loop;
end;
$$;

alter function public.match_entries(jsonb, integer, uuid) security invoker;
alter function public.consume_rate_limit(text, integer, integer) security invoker;

revoke all privileges on function public.match_entries(jsonb, integer, uuid)
  from public, anon, authenticated;
revoke all privileges on function public.consume_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.match_entries(jsonb, integer, uuid) to service_role;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

alter table public.rate_limits enable row level security;
revoke all privileges on table public.rate_limits from public, anon, authenticated;
grant select, insert, update on table public.rate_limits to service_role;

-- Scrub earlier error replies without changing the threads' activity timestamps.
alter table public.chat_messages disable trigger chat_messages_sync_thread_activity;

update public.chat_messages
set content = 'I hit a problem while searching memory for that question.'
where role = 'assistant'
  and status = 'error'
  and content <> 'I hit a problem while searching memory for that question.';

alter table public.chat_messages enable trigger chat_messages_sync_thread_activity;

notify pgrst, 'reload schema';

commit;
