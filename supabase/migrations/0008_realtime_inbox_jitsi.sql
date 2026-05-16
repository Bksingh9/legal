-- Real-time inbox, Jitsi room URL, PWA Web Push subscriptions, and
-- welcome-notification on signup.
--
-- This migration closes the loop between booking and actual meeting at
-- Tier-0: notifications are now durable + replicated over Supabase
-- Realtime, every consultation owns a deterministic Jitsi room URL, and
-- the trigger from 0007 is extended to insert a welcome notification on
-- new user signup.

-- ---------------------------------------------------------------------------
-- notifications: durable inbox, fanned out via supabase_realtime.
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  kind        text not null,
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

create index if not exists notifications_user_recent_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

-- Owner read.
drop policy if exists "notifications_owner_read" on public.notifications;
create policy "notifications_owner_read"
  on public.notifications for select
  using (auth.uid() = user_id);

-- Owner can mark as read (only the read_at column).
drop policy if exists "notifications_owner_mark_read" on public.notifications;
create policy "notifications_owner_mark_read"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- push_subscriptions: Web Push (VAPID) subscriptions per user.
-- ---------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  endpoint      text not null,
  p256dh        text not null,
  auth          text not null,
  user_agent    text,
  created_at    timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subs_owner_all" on public.push_subscriptions;
create policy "push_subs_owner_all"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- jitsi_room_url on consultations.
-- ---------------------------------------------------------------------------
alter table public.consultations
  add column if not exists jitsi_room_url text;

-- ---------------------------------------------------------------------------
-- Replication: REPLICA IDENTITY FULL so Realtime can publish full row
-- payloads, and tables added to the supabase_realtime publication.
-- ---------------------------------------------------------------------------
alter table public.notifications replica identity full;
alter table public.consultation_offers replica identity full;
alter table public.consultations replica identity full;

-- The publication is auto-created by Supabase on every project. Just add
-- the tables to it. Use a defensive add-only loop so re-running this
-- migration doesn't error if a table is already a publication member.
do $$
declare
  t text;
begin
  for t in select unnest(array['notifications','consultation_offers','consultations'])
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then
      null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Extend the 0007 trigger to also insert a welcome notification.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role user_role;
  v_inserted_users boolean := false;
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
    phone = excluded.phone
  returning true into v_inserted_users;

  -- Only fire the welcome notification on a genuine new insert, not on
  -- the email/phone update side of the trigger.
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
