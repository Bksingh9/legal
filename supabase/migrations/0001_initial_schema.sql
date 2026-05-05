-- LegalDesk AI — initial schema (spec §5)
-- All tables RLS-enabled. Application code must run with an authenticated user_id.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- waitlist (Week 1–2 landing capture)
-- ---------------------------------------------------------------------------
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  phone text,
  locale text default 'en',
  source text,
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

-- Inserts come through the service role on the server; no public select.
create policy "waitlist_no_public_read"
  on public.waitlist for select
  using (false);

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('user', 'lawyer', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type kyc_status as enum ('none', 'pending', 'verified', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique,
  email text unique,
  name text,
  locale text default 'en',
  role user_role not null default 'user',
  kyc_status kyc_status not null default 'none',
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users_self_read"
  on public.users for select
  using (auth.uid() = id);

create policy "users_self_update"
  on public.users for update
  using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- lawyers (anonymized — BCI Rule 36)
-- ---------------------------------------------------------------------------
do $$ begin
  create type lawyer_status as enum ('pending', 'verified', 'suspended');
exception when duplicate_object then null; end $$;

create table if not exists public.lawyers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  bar_council_id text not null,
  state text not null,
  specializations text[] not null default '{}',
  years_exp int not null default 0,
  rating numeric(3,2) default 0,
  payout_account jsonb,
  status lawyer_status not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.lawyers enable row level security;

create policy "lawyers_self_read"
  on public.lawyers for select
  using (auth.uid() = user_id);

create policy "lawyers_self_update"
  on public.lawyers for update
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- queries (Tier 1 triage)
-- ---------------------------------------------------------------------------
do $$ begin
  create type query_classification as enum (
    'criminal','civil','family','property','consumer',
    'labour','corporate','tax','cyber','other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type urgency as enum ('low','medium','high','critical');
exception when duplicate_object then null; end $$;

create table if not exists public.queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  raw_text text not null,
  classification query_classification,
  urgency urgency,
  prep_pdf_url text,
  created_at timestamptz not null default now()
);

alter table public.queries enable row level security;

create policy "queries_owner_all"
  on public.queries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- documents (Tier 2 automation)
-- ---------------------------------------------------------------------------
do $$ begin
  create type document_status as enum ('draft','generated','paid','delivered','reviewed');
exception when duplicate_object then null; end $$;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  status document_status not null default 'draft',
  input_json jsonb not null default '{}'::jsonb,
  output_pdf_url text,
  paid boolean not null default false,
  lawyer_review_id uuid,
  created_at timestamptz not null default now()
);

alter table public.documents enable row level security;

create policy "documents_owner_all"
  on public.documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- consultations (Tier 3)
-- ---------------------------------------------------------------------------
do $$ begin
  create type consultation_type as enum ('call','video');
exception when duplicate_object then null; end $$;

do $$ begin
  create type consultation_status as enum (
    'requested','matched','scheduled','in_progress','completed','cancelled','disputed'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.consultations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  lawyer_id uuid references public.lawyers(id) on delete set null,
  type consultation_type not null,
  scheduled_at timestamptz,
  duration_sec int default 0,
  recording_url text,
  transcript_url text,
  summary text,
  amount_inr int not null,
  lawyer_payout_inr int,
  status consultation_status not null default 'requested',
  created_at timestamptz not null default now()
);

alter table public.consultations enable row level security;

create policy "consultations_user_read"
  on public.consultations for select
  using (auth.uid() = user_id);

create policy "consultations_lawyer_read"
  on public.consultations for select
  using (
    exists (
      select 1 from public.lawyers l
      where l.id = consultations.lawyer_id and l.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  razorpay_payment_id text unique,
  amount int not null,
  status text not null,
  sku text not null,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "payments_owner_read"
  on public.payments for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- subscriptions (LegalDesk Plus)
-- ---------------------------------------------------------------------------
do $$ begin
  create type subscription_plan as enum ('plus_yearly','business_basic','business_pro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('active','past_due','cancelled','expired');
exception when duplicate_object then null; end $$;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan subscription_plan not null,
  status subscription_status not null default 'active',
  started_at timestamptz not null default now(),
  renews_at timestamptz
);

alter table public.subscriptions enable row level security;

create policy "subscriptions_owner_read"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- wallet
-- ---------------------------------------------------------------------------
create table if not exists public.wallet (
  user_id uuid primary key references public.users(id) on delete cascade,
  balance_inr int not null default 0,
  ledger jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.wallet enable row level security;

create policy "wallet_owner_read"
  on public.wallet for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- audit_log (service role only)
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log (
  id bigserial primary key,
  actor uuid,
  action text not null,
  target text,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;
-- No public policies. Service role bypasses RLS by design.
