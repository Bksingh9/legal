-- LegalDesk AI — Week 7-8 lawyer onboarding + KYC

-- ---------------------------------------------------------------------------
-- lawyers extensions
-- BCI Rule 36 reminder: lawyer name / photo / contact are NEVER exposed
-- to other users. Anonymized matching uses anon_slug + specializations +
-- years_exp + rating only.
-- ---------------------------------------------------------------------------
alter table public.lawyers
  add column if not exists languages text[] not null default '{}',
  add column if not exists anon_slug text unique,
  add column if not exists route_account_id text,
  add column if not exists digilocker_uri text,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references public.users(id) on delete set null,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspension_reason text,
  add column if not exists updated_at timestamptz not null default now();

-- Random anon_slug for any pre-existing rows.
update public.lawyers
  set anon_slug = encode(gen_random_bytes(6), 'hex')
  where anon_slug is null;

create index if not exists lawyers_status_idx on public.lawyers (status);
create index if not exists lawyers_specializations_gin
  on public.lawyers using gin (specializations);
create index if not exists lawyers_languages_gin
  on public.lawyers using gin (languages);

-- ---------------------------------------------------------------------------
-- lawyer_applications  audit trail for KYC submissions
-- ---------------------------------------------------------------------------
do $$ begin
  create type lawyer_application_status as enum (
    'submitted', 'in_review', 'approved', 'rejected'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.lawyer_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  lawyer_id uuid references public.lawyers(id) on delete set null,
  payload jsonb not null,
  status lawyer_application_status not null default 'submitted',
  notes text,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.lawyer_applications enable row level security;

drop policy if exists "lawyer_applications_owner_read" on public.lawyer_applications;
create policy "lawyer_applications_owner_read"
  on public.lawyer_applications for select
  using (auth.uid() = user_id);

create index if not exists lawyer_applications_user_idx
  on public.lawyer_applications (user_id, created_at desc);
create index if not exists lawyer_applications_status_idx
  on public.lawyer_applications (status, created_at desc);

-- Admins read all rows via the service-role client; no RLS policy needed.
