-- LegalDesk AI — Week 9-10 Tier 3 consultations
-- Match -> offer fan-out -> consent-gated start -> finish -> 24h hold ->
-- payout release. Both-party consent for recording is enforced on the
-- /api/consultations/<id>/start path; without it, recording_url stays null.

-- ---------------------------------------------------------------------------
-- consultations extensions
-- ---------------------------------------------------------------------------
do $$ begin
  create type consultation_pack as enum ('p15', 'p30', 'p60');
exception when duplicate_object then null; end $$;

alter table public.consultations
  add column if not exists pack consultation_pack,
  add column if not exists language text default 'en',
  add column if not exists state text,
  add column if not exists specialization text,
  add column if not exists recording_consent_user boolean,
  add column if not exists recording_consent_lawyer boolean,
  add column if not exists started_at timestamptz,
  add column if not exists ended_at timestamptz,
  add column if not exists dispute_reason text,
  add column if not exists payout_lawyer_inr int,
  add column if not exists payout_held_until timestamptz,
  add column if not exists payout_released_at timestamptz,
  add column if not exists payout_transfer_id text,
  add column if not exists hms_room_id text,
  add column if not exists exotel_call_sid text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists consultations_status_idx
  on public.consultations (status);
create index if not exists consultations_user_created_idx
  on public.consultations (user_id, created_at desc);
create index if not exists consultations_lawyer_idx
  on public.consultations (lawyer_id, status);
create index if not exists consultations_payout_pending_idx
  on public.consultations (payout_held_until)
  where status = 'completed' and payout_released_at is null;

-- ---------------------------------------------------------------------------
-- consultation_offers
-- The match algorithm picks top 3 verified lawyers; each gets an offer row
-- with a TTL. The first lawyer to accept wins; the rest auto-expire.
-- ---------------------------------------------------------------------------
do $$ begin
  create type offer_status as enum ('pending', 'accepted', 'declined', 'expired');
exception when duplicate_object then null; end $$;

create table if not exists public.consultation_offers (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  lawyer_id uuid not null references public.lawyers(id) on delete cascade,
  status offer_status not null default 'pending',
  sent_at timestamptz not null default now(),
  responded_at timestamptz,
  expires_at timestamptz not null default (now() + interval '4 hours'),
  unique (consultation_id, lawyer_id)
);

alter table public.consultation_offers enable row level security;

drop policy if exists "consultation_offers_owner_read" on public.consultation_offers;
create policy "consultation_offers_owner_read"
  on public.consultation_offers for select
  using (
    exists (
      select 1 from public.consultations c
      where c.id = consultation_offers.consultation_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "consultation_offers_lawyer_read" on public.consultation_offers;
create policy "consultation_offers_lawyer_read"
  on public.consultation_offers for select
  using (
    exists (
      select 1 from public.lawyers l
      where l.id = consultation_offers.lawyer_id and l.user_id = auth.uid()
    )
  );

create index if not exists consultation_offers_lawyer_pending_idx
  on public.consultation_offers (lawyer_id, status, expires_at)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- wallet_ledger  proper append-only ledger backing the existing wallet row
-- ---------------------------------------------------------------------------
do $$ begin
  create type wallet_entry_kind as enum (
    'referral_signup',
    'referral_first_paid',
    'dispute_credit',
    'manual_credit',
    'manual_debit',
    'redemption'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.wallet_ledger (
  id bigserial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  delta_inr int not null,
  kind wallet_entry_kind not null,
  reference text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.wallet_ledger enable row level security;

drop policy if exists "wallet_ledger_owner_read" on public.wallet_ledger;
create policy "wallet_ledger_owner_read"
  on public.wallet_ledger for select
  using (auth.uid() = user_id);

create index if not exists wallet_ledger_user_created_idx
  on public.wallet_ledger (user_id, created_at desc);

-- payments may now also link back to a consultation.
alter table public.payments
  add column if not exists consultation_id uuid references public.consultations(id) on delete set null;
