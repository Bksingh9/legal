-- Rate limiting (Tier-0, no Redis / third-party).
--
-- Atomic increment via a SQL function that does an UPSERT inside a
-- single statement, then returns the new count. Callers pass a string
-- key (e.g. "ip:1.2.3.4:consult-leads"), a max threshold, and a
-- window in seconds. The function returns whether the request is
-- allowed.

create table if not exists public.rate_limits (
  key            text primary key,
  count          int not null default 0,
  window_start   timestamptz not null default now()
);

-- Service-role only; the function below runs with definer privileges
-- so no role except service can read or write.
alter table public.rate_limits enable row level security;

create or replace function public.rate_limit_check(
  in_key text,
  in_max int,
  in_window_sec int
)
returns table (allowed boolean, count int, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_row public.rate_limits%rowtype;
begin
  -- Get or insert.
  select * into v_row from public.rate_limits where key = in_key for update;
  if v_row is null then
    insert into public.rate_limits (key, count, window_start)
      values (in_key, 1, v_now)
      returning * into v_row;
    return query
      select true, v_row.count, v_row.window_start + (in_window_sec || ' seconds')::interval;
    return;
  end if;

  -- Reset window if expired.
  if v_row.window_start + (in_window_sec || ' seconds')::interval < v_now then
    update public.rate_limits
      set count = 1, window_start = v_now
      where key = in_key
      returning * into v_row;
    return query
      select true, v_row.count, v_row.window_start + (in_window_sec || ' seconds')::interval;
    return;
  end if;

  -- Under threshold: increment and allow.
  if v_row.count < in_max then
    update public.rate_limits
      set count = count + 1
      where key = in_key
      returning * into v_row;
    return query
      select true, v_row.count, v_row.window_start + (in_window_sec || ' seconds')::interval;
    return;
  end if;

  -- Over threshold: block.
  return query
    select false, v_row.count, v_row.window_start + (in_window_sec || ' seconds')::interval;
end;
$$;

-- Housekeeping: prune rows older than 1 day so the table stays tiny.
create index if not exists rate_limits_window_idx on public.rate_limits (window_start);
