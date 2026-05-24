-- Tier 5 — B2B "LegalDesk for Business".
--
-- Organizations hold a plan + a monthly document quota. They authenticate to
-- the public /api/v1/* surface with API keys (sha256-hashed at rest; only a
-- short display prefix is stored in clear). Usage is metered per calendar
-- month so quota can be enforced atomically in the DB, the same pattern as
-- rate_limits (security-definer function, service-role-only tables).

do $$ begin
  create type org_plan as enum ('starter', 'growth', 'scale');
exception when duplicate_object then null; end $$;

do $$ begin
  create type org_status as enum ('active', 'suspended');
exception when duplicate_object then null; end $$;

create table if not exists public.organizations (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  slug               text not null unique,
  plan               org_plan not null default 'starter',
  status             org_status not null default 'active',
  owner_user_id      uuid references public.users(id) on delete set null,
  monthly_doc_quota  int not null default 100,
  created_at         timestamptz not null default now()
);

create table if not exists public.api_keys (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  name         text not null,
  key_prefix   text not null,            -- e.g. "ldk_live_a1b2c3" for display
  key_hash     text not null unique,     -- sha256(full token), hex
  scopes       text[] not null default '{}',
  last_used_at timestamptz,
  created_at   timestamptz not null default now(),
  revoked_at   timestamptz
);
create index if not exists api_keys_org_idx on public.api_keys (org_id);

-- Monthly metering. One row per (org, 'YYYY-MM'); doc_count incremented
-- atomically by the function below, which also enforces the quota.
create table if not exists public.org_api_usage (
  org_id     uuid not null references public.organizations(id) on delete cascade,
  period     text not null,             -- 'YYYY-MM' (UTC)
  doc_count  int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (org_id, period)
);

alter table public.organizations enable row level security;
alter table public.api_keys enable row level security;
alter table public.org_api_usage enable row level security;

-- Admin-only management surface. The public API uses the service-role client
-- after authenticating the API key, so no anon/authed policies are needed for
-- the metering/key tables; admins manage everything via /admin/orgs.
drop policy if exists "organizations_admin_all" on public.organizations;
create policy "organizations_admin_all" on public.organizations for all
  using (
    exists (
      select 1 from public.user_role_grants g
      where g.user_id = auth.uid() and g.role = 'admin'::user_role and g.revoked_at is null
    )
  );

drop policy if exists "organizations_owner_read" on public.organizations;
create policy "organizations_owner_read" on public.organizations for select
  using (auth.uid() = owner_user_id);

drop policy if exists "api_keys_admin_all" on public.api_keys;
create policy "api_keys_admin_all" on public.api_keys for all
  using (
    exists (
      select 1 from public.user_role_grants g
      where g.user_id = auth.uid() and g.role = 'admin'::user_role and g.revoked_at is null
    )
  );

drop policy if exists "org_api_usage_admin_read" on public.org_api_usage;
create policy "org_api_usage_admin_read" on public.org_api_usage for select
  using (
    exists (
      select 1 from public.user_role_grants g
      where g.user_id = auth.uid() and g.role = 'admin'::user_role and g.revoked_at is null
    )
  );

-- Atomic quota consumer. Increments the current month's doc_count by in_n iff
-- it would stay within in_quota (a quota of 0 or less means "unlimited").
-- Returns whether the request is allowed plus the resulting count.
create or replace function public.org_usage_consume(
  in_org uuid,
  in_period text,
  in_quota int,
  in_n int
)
returns table (allowed boolean, doc_count int, monthly_quota int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.org_api_usage%rowtype;
  v_new int;
begin
  select * into v_row from public.org_api_usage
    where org_id = in_org and period = in_period for update;

  if v_row is null then
    if in_quota > 0 and in_n > in_quota then
      return query select false, 0, in_quota; return;
    end if;
    insert into public.org_api_usage (org_id, period, doc_count, updated_at)
      values (in_org, in_period, in_n, now());
    return query select true, in_n, in_quota; return;
  end if;

  v_new := v_row.doc_count + in_n;
  if in_quota > 0 and v_new > in_quota then
    return query select false, v_row.doc_count, in_quota; return;
  end if;

  update public.org_api_usage set doc_count = v_new, updated_at = now()
    where org_id = in_org and period = in_period;
  return query select true, v_new, in_quota;
end;
$$;
