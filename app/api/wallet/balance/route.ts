import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/triage/persistence";
import { getWalletBalance } from "@/lib/referrals/persistence";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: "Sign in." }, { status: 401 });
    }
    return NextResponse.json({ ok: true, mock: true, balance_paise: 0 });
  }
  const balance = await getWalletBalance(userId);
  return NextResponse.json({ ok: true, balance_paise: balance });
}
