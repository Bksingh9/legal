-- LegalDesk AI — Week 3-4 triage extensions
-- Extends queries with language, confidence, transcript, summary, status.
-- Adds the `case-prep` storage bucket with owner-only read.

-- ---------------------------------------------------------------------------
-- queries extensions
-- ---------------------------------------------------------------------------
do $$ begin
  create type query_status as enum ('pending', 'classified', 'prepped', 'failed');
exception when duplicate_object then null; end $$;

alter table public.queries
  add column if not exists language text default 'en',
  add column if not exists confidence numeric(4,3),
  add column if not exists transcript_url text,
  add column if not exists summary text,
  add column if not exists status query_status not null default 'pending',
  add column if not exists updated_at timestamptz not null default now();

create index if not exists queries_user_created_idx
  on public.queries (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- case-prep storage bucket
-- Private bucket. Owners read their own prep PDFs; service role writes them.
-- The path convention is `{user_id}/{query_id}.pdf` so the policy can match
-- the leading folder against auth.uid().
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('case-prep', 'case-prep', false)
on conflict (id) do nothing;

drop policy if exists "case_prep_owner_read" on storage.objects;
create policy "case_prep_owner_read"
  on storage.objects for select
  using (
    bucket_id = 'case-prep'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Service-role inserts/updates bypass RLS. No public write policy by design.

-- ---------------------------------------------------------------------------
-- triage_audio storage bucket (raw voice uploads, ephemeral)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('triage-audio', 'triage-audio', false)
on conflict (id) do nothing;

drop policy if exists "triage_audio_owner_read" on storage.objects;
create policy "triage_audio_owner_read"
  on storage.objects for select
  using (
    bucket_id = 'triage-audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
