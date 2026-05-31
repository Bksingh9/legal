import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/triage/persistence";
import { acceptOffer } from "@/lib/consult/persistence";
import { getUserContact } from "@/lib/users/persistence";
import { waMeLinkFor } from "@/lib/notify/lawyer-alerts";

export const runtime = "nodejs";

export async function POST(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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

  // Lawyer hand-off: return a wa.me deep link the lawyer can click to
  // message the client directly using their own WhatsApp. Zero-key,
  // BCI-compliant (lawyer initiates, not the platform).
  let waLink: string | null = null;
  const client = await getUserContact(result.consultation.user_id);
  if (client?.phone) {
    waLink = waMeLinkFor({
      clientPhone: client.phone,
      text: `Hi, this is your LegalDesk-matched advocate. Ready when you are — your consultation reference is ${result.consultation.id.slice(0, 8)}.`
    });
  }

  return NextResponse.json({
    ok: true,
    consultation_id: result.consultation.id,
    offer_id: result.offer.id,
    client_whatsapp_link: waLink,
    consultation_link: `/consultations/${result.consultation.id}`
  });
}
