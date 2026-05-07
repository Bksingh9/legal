import { NextResponse } from "next/server";
import { z } from "zod";
import { applyReferralOnSignup } from "@/lib/referrals/persistence";
import { getCurrentUserId } from "@/lib/triage/persistence";

export const runtime = "nodejs";

const Body = z.object({ code: z.string().trim().min(4).max(12) });

export async function POST(req: Request) {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Provide a referral code." }, { status: 400 });
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: "Sign in." }, { status: 401 });
    }
    return NextResponse.json({ ok: true, mock: true });
  }

  const result = await applyReferralOnSignup({
    refereeUserId: userId,
    code: parsed.code
  });
  if (!result.ok && result.reason !== "already_claimed") {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    referrer_user_id: result.referrer_user_id ?? null,
    note: result.reason ?? null
  });
}
