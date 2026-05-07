import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/triage/persistence";
import { acceptOffer } from "@/lib/consult/persistence";

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

  const result = await acceptOffer({ offerId: params.id, lawyerUserId: userId });
  if (!result) {
    return NextResponse.json(
      { error: "Offer no longer available." },
      { status: 409 }
    );
  }
  return NextResponse.json({
    ok: true,
    consultation_id: result.consultation.id,
    offer_id: result.offer.id
  });
}
