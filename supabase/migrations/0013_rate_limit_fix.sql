-- Fix: the "count" column was ambiguous with the RETURNS TABLE OUT
-- parameter named "count", so the UPDATE statement errored on every
-- call after the first and the lib/rate-limit/check.ts wrapper
-- failed open. Rename the OUT params and table-qualify the
-- references.

drop function if exists public.rate_limit_check(text, int, int);

create or replace function public.rate_limit_check(
  in_key text,
  in_max int,
  in_window_sec int
)
returns table (allowed boolean, hit_count int, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_row public.rate_limits%rowtype;
begin
  select * into v_row from public.rate_limits where key = in_key for update;

  if v_row.key is null then
    insert into public.rate_limits (key, count, window_start)
      values (in_key, 1, v_now)
      returning * into v_row;
    return query
      select true, v_row.count, v_row.window_start + (in_window_sec || ' seconds')::interval;
    return;
  end if;

  -- Window expired: reset.
  if v_row.window_start + (in_window_sec || ' seconds')::interval < v_now then
    update public.rate_limits as rl
      set count = 1, window_start = v_now
      where rl.key = in_key
      returning rl.* into v_row;
    return query
      select true, v_row.count, v_row.window_start + (in_window_sec || ' seconds')::interval;
    return;
  end if;

  -- Under threshold: increment.
  if v_row.count < in_max then
    update public.rate_limits as rl
      set count = rl.count + 1
      where rl.key = in_key
      returning rl.* into v_row;
    return query
      select true, v_row.count, v_row.window_start + (in_window_sec || ' seconds')::interval;
    return;
  end if;

  -- Over threshold: block.
  return query
    select false, v_row.count, v_row.window_start + (in_window_sec || ' seconds')::interval;
end;
$$;
