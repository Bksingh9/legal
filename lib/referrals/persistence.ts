import { randomBytes } from "node:crypto";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export interface ReferralRow {
  user_id: string;
  code: string;
  signup_credit_paise: number;
  paid_credit_paise: number;
  signups: number;
  paid_referrals: number;
  created_at: string;
}

export interface WalletEntry {
  delta_inr: number;
  kind:
    | "referral_signup"
    | "referral_first_paid"
    | "dispute_credit"
    | "manual_credit"
    | "manual_debit"
    | "redemption";
  reference?: string;
  notes?: string;
}

// Crockford-ish base32 (no I O 0 1) for human readability.
const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";

function makeCode(): string {
  const bytes = randomBytes(6);
  let code = "";
  for (const b of bytes) code += ALPHABET[b % ALPHABET.length];
  return code;
}

export async function getOrCreateReferralCode(userId: string): Promise<ReferralRow | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;

  const { data: existing, error: selErr } = await supa
    .from("referrals")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (selErr) {
    console.error("[referrals] select", selErr);
    return null;
  }
  if (existing) return existing as ReferralRow;

  // Insert with a generated code; retry once on collision.
  for (let attempt = 0; attempt < 4; attempt++) {
    const code = makeCode();
    const { data, error } = await supa
      .from("referrals")
      .insert({ user_id: userId, code })
      .select("*")
      .single();
    if (!error) return data as ReferralRow;
    if ((error as { code?: string }).code !== "23505") {
      console.error("[referrals] insert", error);
      return null;
    }
  }
  return null;
}

export async function findReferralByCode(code: string): Promise<ReferralRow | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;
  const { data, error } = await supa
    .from("referrals")
    .select("*")
    .eq("code", code.toUpperCase().trim())
    .maybeSingle();
  if (error) {
    console.error("[referrals] findByCode", error);
    return null;
  }
  return (data as ReferralRow) ?? null;
}

// Apply a referral code to a referee at signup time. Idempotent: a
// referee may only ever be claimed by one referrer, and the signup credit
// fires exactly once.
export async function applyReferralOnSignup(args: {
  refereeUserId: string;
  code: string;
}): Promise<{ ok: boolean; reason?: string; referrer_user_id?: string }> {
  const supa = getSupabaseServiceClient();
  if (!supa) return { ok: false, reason: "no_supabase" };

  const referrer = await findReferralByCode(args.code);
  if (!referrer) return { ok: false, reason: "code_not_found" };
  if (referrer.user_id === args.refereeUserId) {
    return { ok: false, reason: "self_referral" };
  }

  // Idempotent insert — unique (referrer_user_id, referee_user_id).
  const now = new Date().toISOString();
  const { error: insErr } = await supa
    .from("referral_claims")
    .insert({
      referrer_user_id: referrer.user_id,
      referee_user_id: args.refereeUserId,
      signup_credited_at: now
    });
  if (insErr) {
    if ((insErr as { code?: string }).code === "23505") {
      return { ok: true, reason: "already_claimed", referrer_user_id: referrer.user_id };
    }
    console.error("[referrals] claim insert", insErr);
    return { ok: false, reason: "claim_failed" };
  }

  // Credit referrer's wallet ledger by the configured signup amount.
  await creditWallet({
    userId: referrer.user_id,
    delta_inr: referrer.signup_credit_paise,
    kind: "referral_signup",
    reference: args.refereeUserId,
    notes: "Referral signup credit"
  });
  await supa
    .from("referrals")
    .update({ signups: referrer.signups + 1 })
    .eq("user_id", referrer.user_id);

  return { ok: true, referrer_user_id: referrer.user_id };
}

// Fires when the referee completes their first paid transaction. Uses the
// referral_claims row's first_paid_credited_at as the idempotency guard.
export async function maybeCreditFirstPaid(refereeUserId: string): Promise<boolean> {
  const supa = getSupabaseServiceClient();
  if (!supa) return false;

  const { data, error } = await supa
    .from("referral_claims")
    .select("*")
    .eq("referee_user_id", refereeUserId)
    .is("first_paid_credited_at", null)
    .maybeSingle();
  if (error || !data) return false;
  const claim = data as {
    referrer_user_id: string;
    referee_user_id: string;
  };

  const referrer = await getReferralRow(claim.referrer_user_id);
  if (!referrer) return false;

  const now = new Date().toISOString();
  await supa
    .from("referral_claims")
    .update({ first_paid_credited_at: now })
    .eq("referrer_user_id", claim.referrer_user_id)
    .eq("referee_user_id", claim.referee_user_id)
    .is("first_paid_credited_at", null);

  await creditWallet({
    userId: claim.referrer_user_id,
    delta_inr: referrer.paid_credit_paise,
    kind: "referral_first_paid",
    reference: claim.referee_user_id,
    notes: "Referral first-paid credit"
  });
  await supa
    .from("referrals")
    .update({ paid_referrals: referrer.paid_referrals + 1 })
    .eq("user_id", referrer.user_id);

  return true;
}

async function getReferralRow(userId: string): Promise<ReferralRow | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;
  const { data, error } = await supa
    .from("referrals")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return null;
  return (data as ReferralRow) ?? null;
}

// ---------------------------------------------------------------------------
// wallet ledger helpers
// ---------------------------------------------------------------------------
export async function creditWallet(entry: { userId: string } & WalletEntry): Promise<void> {
  const supa = getSupabaseServiceClient();
  if (!supa) return;
  const { error } = await supa.from("wallet_ledger").insert({
    user_id: entry.userId,
    delta_inr: entry.delta_inr,
    kind: entry.kind,
    reference: entry.reference ?? null,
    notes: entry.notes ?? null
  });
  if (error) console.error("[referrals] creditWallet", error);

  // Mirror onto the running balance row.
  const { data: cur } = await supa
    .from("wallet")
    .select("balance_inr")
    .eq("user_id", entry.userId)
    .maybeSingle();
  if (cur) {
    await supa
      .from("wallet")
      .update({
        balance_inr: (cur as { balance_inr: number }).balance_inr + entry.delta_inr,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", entry.userId);
  } else {
    await supa.from("wallet").insert({
      user_id: entry.userId,
      balance_inr: entry.delta_inr
    });
  }
}

export async function getWalletBalance(userId: string): Promise<number> {
  const supa = getSupabaseServiceClient();
  if (!supa) return 0;
  const { data, error } = await supa
    .from("wallet")
    .select("balance_inr")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return 0;
  return (data as { balance_inr: number }).balance_inr;
}
