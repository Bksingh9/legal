-- DPDP Act 2023 §11 audit-trail: every form submission that processes
-- personal data must record which version of the privacy notice +
-- terms the data principal accepted at the moment of collection.
--
-- Approach: add `consent_policy_version` + `consented_at` to every
-- table that captures personal data via a public form. Existing rows
-- get NULL (pre-policy backfill).

alter table public.consultation_leads
  add column if not exists consent_policy_version text,
  add column if not exists consented_at timestamptz,
  add column if not exists marketing_opt_in boolean default false;

alter table public.lawyer_applications
  add column if not exists consent_policy_version text,
  add column if not exists consented_at timestamptz;

alter table public.lawyers
  add column if not exists pan text,
  add column if not exists gstin text;

-- PAN format: AAAAA9999A (5 letters, 4 digits, 1 letter). GSTIN
-- format: 15 alphanumeric. Both validated at the application layer;
-- DB layer just stores.

alter table public.users
  add column if not exists marketing_opt_in boolean default false,
  add column if not exists consent_policy_version text,
  add column if not exists consented_at timestamptz;
