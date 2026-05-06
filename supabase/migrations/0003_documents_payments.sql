-- LegalDesk AI — Week 5-6 documents + payments
-- Extends documents for the SKU model, adds the lawyer_reviews queue,
-- and creates the `documents` Storage bucket with owner-only read.

-- ---------------------------------------------------------------------------
-- documents extensions
-- ---------------------------------------------------------------------------
alter table public.documents
  add column if not exists sku text,
  add column if not exists price_paise int not null default 0,
  add column if not exists output_docx_url text,
  add column if not exists addon_lawyer_review boolean not null default false,
  add column if not exists language text default 'en',
  add column if not exists payment_id uuid,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists documents_user_created_idx
  on public.documents (user_id, created_at desc);

create index if not exists documents_sku_status_idx
  on public.documents (sku, status);

-- ---------------------------------------------------------------------------
-- payments — link back to the document and accept INR paise
-- ---------------------------------------------------------------------------
alter table public.payments
  add column if not exists document_id uuid references public.documents(id) on delete set null,
  add column if not exists razorpay_order_id text,
  add column if not exists currency text not null default 'INR',
  add column if not exists captured_at timestamptz;

create unique index if not exists payments_razorpay_order_id_idx
  on public.payments (razorpay_order_id)
  where razorpay_order_id is not null;

-- ---------------------------------------------------------------------------
-- lawyer_reviews queue (Tier 2 add-on; surfaced to lawyers in W7-8)
-- ---------------------------------------------------------------------------
do $$ begin
  create type lawyer_review_status as enum (
    'pending', 'claimed', 'completed', 'cancelled'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.lawyer_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  lawyer_id uuid references public.lawyers(id) on delete set null,
  status lawyer_review_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  completed_at timestamptz
);

alter table public.lawyer_reviews enable row level security;

-- The user owns the review request; lawyers see only the claim queue
-- (no PII fields exposed via RLS — claim queue surfaces specialization
-- and language only, fetched via the service role in W7-8).
drop policy if exists "lawyer_reviews_owner_read" on public.lawyer_reviews;
create policy "lawyer_reviews_owner_read"
  on public.lawyer_reviews for select
  using (auth.uid() = user_id);

drop policy if exists "lawyer_reviews_assigned_read" on public.lawyer_reviews;
create policy "lawyer_reviews_assigned_read"
  on public.lawyer_reviews for select
  using (
    exists (
      select 1 from public.lawyers l
      where l.id = lawyer_reviews.lawyer_id and l.user_id = auth.uid()
    )
  );

-- Backfill: documents.lawyer_review_id was added in 0001 as untyped uuid;
-- convert to a proper FK now that the table exists.
do $$ begin
  alter table public.documents
    add constraint documents_lawyer_review_fk
    foreign key (lawyer_review_id) references public.lawyer_reviews(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- documents Storage bucket
-- Path convention: {user_id}/{document_id}.{pdf|docx}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "documents_owner_read" on storage.objects;
create policy "documents_owner_read"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
