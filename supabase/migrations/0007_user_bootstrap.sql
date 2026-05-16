-- Mirror auth.users into public.users automatically.
--
-- Spec §5 defines public.users with FK references auth.users(id). Until
-- now, the public.users row was created lazily by app code on first
-- interaction. Anything that FKs to public.users (queries, consultations,
-- lawyers, etc.) would 500 for a freshly-signed-up user who hadn't yet
-- triggered the lazy-creation path.
--
-- Fix: a SECURITY DEFINER trigger function on auth.users that maintains
-- public.users in lockstep. Cascade delete is already wired via the FK
-- definition in 0001_initial_schema.sql, so this only handles inserts
-- and email/phone updates.

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

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

drop trigger if exists on_auth_user_email_or_phone_change on auth.users;
create trigger on_auth_user_email_or_phone_change
  after update of email, phone on auth.users
  for each row execute function public.handle_new_auth_user();

-- Backfill: every existing auth.users row gets a public.users row.
insert into public.users (id, email, phone, locale, role)
select
  u.id,
  u.email,
  u.phone,
  coalesce(u.raw_user_meta_data->>'locale', 'en'),
  case
    when u.email like '%@legaldesk.ai' then 'admin'::user_role
    else 'user'::user_role
  end
from auth.users u
where not exists (select 1 from public.users p where p.id = u.id);
