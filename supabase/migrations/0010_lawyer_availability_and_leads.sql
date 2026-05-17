-- Lawyer availability fields + client lead-capture (Vakilsearch pattern).
--
-- Two additions:
--   1. lawyers.hours_per_week, availability_note, notification_email,
--      notification_whatsapp — collected on apply.
--   2. consultation_leads — lightweight 3-field intake from
--      /talk-to-lawyer. Admin reviews + converts to a real
--      `consultations` row + match.

alter table public.lawyers
  add column if not exists hours_per_week int
    check (hours_per_week is null or (hours_per_week between 0 and 60)),
  add column if not exists availability_note text,
  add column if not exists notification_email text,
  add column if not exists notification_whatsapp text;

do $$ begin
  create type lead_status as enum ('new', 'called', 'converted', 'dropped');
exception when duplicate_object then null; end $$;

create table if not exists public.consultation_leads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text not null,
  email       text,
  city        text,
  issue       text not null,
  inferred_specialization query_classification,
  status      lead_status not null default 'new',
  handled_by  uuid references public.users(id),
  handled_at  timestamptz,
  user_id     uuid references public.users(id),
  consultation_id uuid references public.consultations(id),
  created_at  timestamptz not null default now()
);

create index if not exists consultation_leads_new_idx
  on public.consultation_leads (created_at desc)
  where status = 'new';

alter table public.consultation_leads enable row level security;

-- Admin-only read + update. Inserts go through the service-role API.
drop policy if exists "leads_admin_read" on public.consultation_leads;
create policy "leads_admin_read"
  on public.consultation_leads for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'::user_role
    )
  );

drop policy if exists "leads_admin_update" on public.consultation_leads;
create policy "leads_admin_update"
  on public.consultation_leads for update
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'::user_role
    )
  );

-- Add the leads table to realtime publication so admin /admin/leads
-- updates live as new submissions land.
alter table public.consultation_leads replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.consultation_leads;
exception when duplicate_object then null; end $$;
