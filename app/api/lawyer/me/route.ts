import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/triage/persistence";
import { getLawyerSelfView } from "@/lib/lawyers/persistence";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: "Sign in." }, { status: 401 });
    }
    return NextResponse.json({ ok: true, mock: true, lawyer: null });
  }

  const view = await getLawyerSelfView(userId);
  return NextResponse.json({ ok: true, lawyer: view });
}
