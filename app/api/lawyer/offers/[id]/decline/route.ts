import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/triage/persistence";
import { declineOffer } from "@/lib/consult/persistence";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: "Sign in." }, { status: 401 });
    }
    return NextResponse.json({ ok: true, mock: true });
  }
  const ok = await declineOffer({ offerId: params.id, lawyerUserId: userId });
  if (!ok) return NextResponse.json({ error: "Could not decline." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
