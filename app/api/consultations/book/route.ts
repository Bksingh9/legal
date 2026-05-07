import { NextResponse } from "next/server";
import { BookConsultInput, getPack } from "@/lib/consult/packs";
import { getCurrentUserId } from "@/lib/triage/persistence";
import { createConsultationDraft, attachOffers } from "@/lib/consult/persistence";
import { matchLawyers } from "@/lib/match/lawyers";
import { createOrder } from "@/lib/razorpay/client";
import { upsertCreatedPayment } from "@/lib/payments/persistence";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = BookConsultInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.format() },
      { status: 400 }
    );
  }
  const pack = getPack(parsed.data.pack);
  if (!pack) return NextResponse.json({ error: "Unknown pack." }, { status: 400 });

  const userId = await getCurrentUserId();
  if (!userId) {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: "Sign in." }, { status: 401 });
    }
    return NextResponse.json({
      ok: true,
      mock: true,
      consultation_id: "consult_mock",
      offers: [],
      order_id: "order_mock",
      amount_paise: pack.price_paise
    });
  }

  const draft = await createConsultationDraft({
    userId,
    input: parsed.data,
    amount_inr_paise: pack.price_paise
  });
  if (!draft) return NextResponse.json({ error: "Could not save booking." }, { status: 500 });

  const matches = await matchLawyers({
    specialization: parsed.data.specialization,
    language: parsed.data.language,
    state: parsed.data.state,
    fanout: 3
  });
  const offers =
    matches.length > 0
      ? await attachOffers({
          consultationId: draft.id,
          lawyerIds: matches.map((m) => m.id)
        })
      : [];

  const order = await createOrder({
    amount_paise: pack.price_paise,
    receipt: `consult_${draft.id.slice(0, 24)}`,
    notes: { consultation_id: draft.id, pack: pack.id, user_id: userId }
  });
  await upsertCreatedPayment({
    userId,
    documentId: draft.id, // payments.document_id is FK-nullable; webhooks key off razorpay_order_id
    sku: `consult_${pack.id}`,
    amount_paise: pack.price_paise,
    razorpay_order_id: order.id,
    idempotency_key: `consult:${draft.id}`
  });

  return NextResponse.json({
    ok: true,
    consultation_id: draft.id,
    matched: offers.length,
    order_id: order.id,
    amount_paise: order.amount,
    razorpay_key_id: process.env.RAZORPAY_KEY_ID ?? null
  });
}
