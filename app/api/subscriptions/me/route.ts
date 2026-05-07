import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/triage/persistence";
import { getActivePlus, plusEntitlementsFor } from "@/lib/subscriptions/persistence";

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
      subscription: null,
      entitlements: plusEntitlementsFor(null)
    });
  }
  const sub = await getActivePlus(userId);
  return NextResponse.json({
    ok: true,
    subscription: sub,
    entitlements: plusEntitlementsFor(sub)
  });
}
