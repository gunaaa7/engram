create table if not exists public.rate_limits (
  bucket text primary key,
  count integer not null default 0,
  window_started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rate_limits_updated_at_idx
  on public.rate_limits (updated_at);

create or replace function public.consume_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  reset_at timestamptz,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_row public.rate_limits%rowtype;
  v_reset_at timestamptz;
begin
  if p_bucket is null or btrim(p_bucket) = '' then
    raise exception 'bucket is required';
  end if;

  if p_limit < 1 then
    raise exception 'limit must be >= 1';
  end if;

  if p_window_seconds < 1 then
    raise exception 'window_seconds must be >= 1';
  end if;

  insert into public.rate_limits (
    bucket,
    count,
    window_started_at,
    updated_at
  )
  values (
    p_bucket,
    0,
    v_now,
    v_now
  )
  on conflict (bucket) do nothing;

  select *
  into v_row
  from public.rate_limits
  where bucket = p_bucket
  for update;

  if v_row.window_started_at <= v_now - make_interval(secs => p_window_seconds) then
    update public.rate_limits
    set
      count = 1,
      window_started_at = v_now,
      updated_at = v_now
    where bucket = p_bucket
    returning * into v_row;

    v_reset_at := v_now + make_interval(secs => p_window_seconds);

    return query
    select
      true,
      greatest(p_limit - 1, 0),
      v_reset_at,
      0;

    return;
  end if;

  v_reset_at := v_row.window_started_at + make_interval(secs => p_window_seconds);

  if v_row.count >= p_limit then
    return query
    select
      false,
      0,
      v_reset_at,
      greatest(ceil(extract(epoch from v_reset_at - v_now))::integer, 1);

    return;
  end if;

  update public.rate_limits
  set
    count = v_row.count + 1,
    updated_at = v_now
  where bucket = p_bucket
  returning * into v_row;

  return query
  select
    true,
    greatest(p_limit - v_row.count, 0),
    v_reset_at,
    0;
end;
$$;
