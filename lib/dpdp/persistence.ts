import { getSupabaseServiceClient } from "@/lib/supabase/server";

// Per spec §1, every user can request access, correction, and erasure.
// "Erase" is a soft tombstone: the auth.users row is left in place so we
// can preserve the audit_log of past actions; everything else owned by
// the user is purged or anonymised.

export interface DpdpExport {
  exported_at: string;
  user: Record<string, unknown> | null;
  queries: Array<Record<string, unknown>>;
  documents: Array<Record<string, unknown>>;
  payments: Array<Record<string, unknown>>;
  consultations: Array<Record<string, unknown>>;
  consultation_offers: Array<Record<string, unknown>>;
  subscriptions: Array<Record<string, unknown>>;
  wallet: Record<string, unknown> | null;
  wallet_ledger: Array<Record<string, unknown>>;
  referrals: Record<string, unknown> | null;
  referral_claims: Array<Record<string, unknown>>;
  lawyer: Record<string, unknown> | null;
  lawyer_applications: Array<Record<string, unknown>>;
}

export async function exportUserData(userId: string): Promise<DpdpExport | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;

  // Run reads in parallel; each table is keyed off user_id (the lawyer
  // path is keyed off lawyers.user_id and is null for non-lawyers).
  const [
    user, queries, documents, payments, consultations, offers,
    subscriptions, wallet, walletLedger, referrals, referralClaims,
    lawyer, lawyerApps
  ] = await Promise.all([
    supa.from("users").select("*").eq("id", userId).maybeSingle(),
    supa.from("queries").select("*").eq("user_id", userId),
    supa.from("documents").select("*").eq("user_id", userId),
    supa.from("payments").select("*").eq("user_id", userId),
    supa.from("consultations").select("*").eq("user_id", userId),
    supa
      .from("consultation_offers")
      .select("*, consultations!inner(user_id)")
      .eq("consultations.user_id", userId),
    supa.from("subscriptions").select("*").eq("user_id", userId),
    supa.from("wallet").select("*").eq("user_id", userId).maybeSingle(),
    supa.from("wallet_ledger").select("*").eq("user_id", userId),
    supa.from("referrals").select("*").eq("user_id", userId).maybeSingle(),
    supa
      .from("referral_claims")
      .select("*")
      .or(`referrer_user_id.eq.${userId},referee_user_id.eq.${userId}`),
    supa.from("lawyers").select("*").eq("user_id", userId).maybeSingle(),
    supa.from("lawyer_applications").select("*").eq("user_id", userId)
  ]);

  return {
    exported_at: new Date().toISOString(),
    user: (user.data as Record<string, unknown> | null) ?? null,
    queries: (queries.data as Array<Record<string, unknown>>) ?? [],
    documents: (documents.data as Array<Record<string, unknown>>) ?? [],
    payments: (payments.data as Array<Record<string, unknown>>) ?? [],
    consultations: (consultations.data as Array<Record<string, unknown>>) ?? [],
    consultation_offers: (offers.data as Array<Record<string, unknown>>) ?? [],
    subscriptions: (subscriptions.data as Array<Record<string, unknown>>) ?? [],
    wallet: (wallet.data as Record<string, unknown> | null) ?? null,
    wallet_ledger: (walletLedger.data as Array<Record<string, unknown>>) ?? [],
    referrals: (referrals.data as Record<string, unknown> | null) ?? null,
    referral_claims: (referralClaims.data as Array<Record<string, unknown>>) ?? [],
    lawyer: (lawyer.data as Record<string, unknown> | null) ?? null,
    lawyer_applications: (lawyerApps.data as Array<Record<string, unknown>>) ?? []
  };
}

// Correction is intentionally narrow: only the user's own profile fields
// (name, locale). Phone and email are tied to auth and must be changed
// via the auth surface; role and kyc_status are admin-controlled.
export interface CorrectionInput {
  name?: string;
  locale?: string;
}

export async function correctProfile(args: {
  userId: string;
  patch: CorrectionInput;
}): Promise<boolean> {
  const supa = getSupabaseServiceClient();
  if (!supa) return false;
  const update: Record<string, unknown> = {};
  if (typeof args.patch.name === "string") update.name = args.patch.name.trim();
  if (typeof args.patch.locale === "string") update.locale = args.patch.locale.trim();
  if (Object.keys(update).length === 0) return false;

  const { error } = await supa.from("users").update(update).eq("id", args.userId);
  if (error) {
    console.error("[dpdp] correctProfile", error);
    return false;
  }
  await audit({ actorId: args.userId, action: "dpdp.correct", payload: update });
  return true;
}

// Erase is a soft tombstone. We:
// - null out PII on the user row (name, phone, email, locale)
// - delete queries / documents / consultation rows owned by the user via
//   the existing FKs (users.id ON DELETE CASCADE handles most paths)
// - keep audit_log rows by reference, but their actor uuid is preserved
//   so prior fraud / dispute trail is not destroyed
// In practice we DELETE the public.users row, which cascades to every
// owned row except audit_log (which doesn't FK on users.id).
export async function eraseUser(userId: string): Promise<boolean> {
  const supa = getSupabaseServiceClient();
  if (!supa) return false;

  await audit({
    actorId: userId,
    action: "dpdp.erase.requested",
    payload: { ts: new Date().toISOString() }
  });

  // Anonymise queries / consultation summaries / transcripts before the
  // cascade so any backups or replication snapshots taken pre-cascade
  // also lose the PII content.
  await supa
    .from("queries")
    .update({ raw_text: "[erased]", summary: null, transcript_url: null })
    .eq("user_id", userId);
  await supa
    .from("consultations")
    .update({ summary: null, transcript_url: null, recording_url: null, dispute_reason: null })
    .eq("user_id", userId);

  // Delete the public.users row. The schema's ON DELETE CASCADE clauses
  // (lawyers, queries, documents, consultations, payments, subscriptions,
  // wallet, wallet_ledger, referrals, referral_claims, lawyer_applications,
  // lawyer_reviews) carry the rest.
  const { error } = await supa.from("users").delete().eq("id", userId);
  if (error) {
    console.error("[dpdp] eraseUser delete", error);
    return false;
  }

  await audit({
    actorId: userId,
    action: "dpdp.erase.completed",
    payload: { ts: new Date().toISOString() }
  });
  return true;
}

async function audit(args: {
  actorId: string;
  action: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  const supa = getSupabaseServiceClient();
  if (!supa) return;
  await supa
    .from("audit_log")
    .insert({ actor: args.actorId, action: args.action, payload: args.payload });
}
