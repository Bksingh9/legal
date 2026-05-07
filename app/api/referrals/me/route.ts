import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/triage/persistence";
import { getOrCreateReferralCode, getWalletBalance } from "@/lib/referrals/persistence";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: "Sign in." }, { status: 401 });
    }
    return NextResponse.json({
      ok: true,
      mock: true,
      code: "MOCK01",
      signups: 0,
      paid_referrals: 0,
      wallet_balance_paise: 0
    });
  }

  const ref = await getOrCreateReferralCode(userId);
  const balance = await getWalletBalance(userId);
  if (!ref) return NextResponse.json({ error: "Could not load referral." }, { status: 500 });
  return NextResponse.json({
    ok: true,
    code: ref.code,
    signups: ref.signups,
    paid_referrals: ref.paid_referrals,
    signup_credit_paise: ref.signup_credit_paise,
    paid_credit_paise: ref.paid_credit_paise,
    wallet_balance_paise: balance
  });
}
