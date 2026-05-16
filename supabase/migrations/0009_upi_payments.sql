-- UPI deep-link payment path (Tier-0, no Razorpay key required).
--
-- Flow:
--   1. User clicks "Pay with UPI" → opens upi://pay deep link or scans QR
--   2. After paying, user submits the 12-digit UTR back to the app
--      via /api/payments/upi-confirm.
--   3. Admin reconciles UTRs against the bank statement weekly and
--      flips the row to verified=true via /api/admin/payments/[id]/verify.
--   4. App treats payments.status='captured' as the unlock signal — for
--      UPI this is set only after admin verification.

do $$ begin
  create type payment_method as enum ('razorpay', 'stripe', 'upi');
exception when duplicate_object then null; end $$;

alter table public.payments
  add column if not exists method payment_method default 'razorpay',
  add column if not exists upi_vpa text,
  add column if not exists upi_utr text,
  add column if not exists upi_submitted_at timestamptz,
  add column if not exists verified_by uuid references public.users(id),
  add column if not exists verified_at timestamptz;

-- UTR is unique per payment provider; soft-unique via partial index so
-- legitimately re-submitted UTRs are caught.
create unique index if not exists payments_upi_utr_unique
  on public.payments (upi_utr)
  where upi_utr is not null;

-- Admins (role='admin' from migration 0007) can read every payment so
-- they can reconcile. Owners still see their own only (existing
-- payments_owner_read policy from 0001 stays in place).
drop policy if exists "payments_admin_read_all" on public.payments;
create policy "payments_admin_read_all"
  on public.payments for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'::user_role
    )
  );

drop policy if exists "payments_admin_update_verify" on public.payments;
create policy "payments_admin_update_verify"
  on public.payments for update
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'::user_role
    )
  );
