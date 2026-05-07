-- LegalDesk AI — Week 11-12 subscriptions + referrals + blog

-- ---------------------------------------------------------------------------
-- subscriptions extensions
-- ---------------------------------------------------------------------------
alter table public.subscriptions
  add column if not exists razorpay_subscription_id text unique,
  add column if not exists razorpay_plan_id text,
  add column if not exists paid_until timestamptz,
  add column if not exists docs_used int not null default 0,
  add column if not exists consult_minutes_used int not null default 0,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists subscriptions_user_status_idx
  on public.subscriptions (user_id, status);

-- ---------------------------------------------------------------------------
-- referrals
-- One referral row per user. The 6-character code (alphanumeric, upper) is
-- generated on first read; the wallet ledger entries fire when a referee
-- signs up (signup_credit_paise = 100_00) and again when the referee
-- completes their first paid transaction (paid_credit_paise = 250_00).
-- ---------------------------------------------------------------------------
create table if not exists public.referrals (
  user_id uuid primary key references public.users(id) on delete cascade,
  code text not null unique,
  signup_credit_paise int not null default 100_00,
  paid_credit_paise int not null default 250_00,
  signups int not null default 0,
  paid_referrals int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.referrals enable row level security;

drop policy if exists "referrals_owner_read" on public.referrals;
create policy "referrals_owner_read"
  on public.referrals for select
  using (auth.uid() = user_id);

-- referral_claims  ledger of who-was-referred-by-whom and which milestones
-- have already credited (idempotency for the wallet credits).
create table if not exists public.referral_claims (
  id bigserial primary key,
  referrer_user_id uuid not null references public.users(id) on delete cascade,
  referee_user_id uuid not null references public.users(id) on delete cascade,
  signup_credited_at timestamptz,
  first_paid_credited_at timestamptz,
  created_at timestamptz not null default now(),
  unique (referrer_user_id, referee_user_id)
);

alter table public.referral_claims enable row level security;

drop policy if exists "referral_claims_referrer_read" on public.referral_claims;
create policy "referral_claims_referrer_read"
  on public.referral_claims for select
  using (auth.uid() = referrer_user_id);

create index if not exists referral_claims_referee_idx
  on public.referral_claims (referee_user_id);

-- ---------------------------------------------------------------------------
-- blog_posts  founder-reviewed SEO articles (spec §6)
-- BCI Rule 36: never names a lawyer in body or in author. The author
-- column is fixed to 'LegalDesk AI Team'; we don't surface a person.
-- ---------------------------------------------------------------------------
do $$ begin
  create type blog_post_status as enum ('draft', 'review', 'published');
exception when duplicate_object then null; end $$;

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  body_md text not null,
  faq_json jsonb,
  intent_keywords text[] not null default '{}',
  status blog_post_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.blog_posts enable row level security;

drop policy if exists "blog_posts_public_published_read" on public.blog_posts;
create policy "blog_posts_public_published_read"
  on public.blog_posts for select
  using (status = 'published');

create index if not exists blog_posts_status_published_idx
  on public.blog_posts (status, published_at desc);
