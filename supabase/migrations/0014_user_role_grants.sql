-- Proper RBAC: replaces the @legaldesk.ai email-pattern admin check
-- with a normalised user_role_grants table. The existing single
-- `users.role` column stays as the "primary" role (set by the
-- 0007 trigger); this table carries additional grants for staff
-- who may hold multiple roles or need their grant audited.

create table if not exists public.user_role_grants (
  user_id    uuid not null references public.users(id) on delete cascade,
  role       user_role not null,
  granted_by uuid references public.users(id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  reason     text,
  primary key (user_id, role)
);

alter table public.user_role_grants enable row level security;

-- Owners see their own grants; admins see everything.
drop policy if exists "user_role_grants_self_read" on public.user_role_grants;
create policy "user_role_grants_self_read"
  on public.user_role_grants for select
  using (auth.uid() = user_id);

drop policy if exists "user_role_grants_admin_all" on public.user_role_grants;
create policy "user_role_grants_admin_all"
  on public.user_role_grants for all
  using (
    exists (
      select 1 from public.user_role_grants g
      where g.user_id = auth.uid()
        and g.role = 'admin'::user_role
        and g.revoked_at is null
    )
  );

-- Backfill: every existing user whose users.role is 'admin' gets a
-- grant. The 0007 trigger continues to seed users.role='admin' for
-- @legaldesk.ai signups; we mirror that into the grants table.
insert into public.user_role_grants (user_id, role)
select id, role from public.users where role = 'admin'::user_role
on conflict do nothing;

-- Extend the auth-user trigger so future @legaldesk.ai signups also
-- write a grants row in the same transaction.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role user_role;
begin
  v_role := case
    when new.email like '%@legaldesk.ai' then 'admin'::user_role
    else 'user'::user_role
  end;

  insert into public.users (id, email, phone, locale, role)
  values (
    new.id,
    new.email,
    new.phone,
    coalesce(new.raw_user_meta_data->>'locale', 'en'),
    v_role
  )
  on conflict (id) do update set
    email = excluded.email,
    phone = excluded.phone;

  -- Mirror admin role into the grants table (idempotent).
  if v_role = 'admin'::user_role then
    insert into public.user_role_grants (user_id, role)
      values (new.id, 'admin'::user_role)
      on conflict do nothing;
  end if;

  -- Welcome notification (from migration 0008, preserved here).
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, kind, title, body, link)
    values (
      new.id,
      'welcome',
      'Welcome to LegalDesk AI',
      'Start with a free legal triage. We will route you to the right document or lawyer.',
      '/triage'
    );
  end if;

  return new;
end;
$$;
