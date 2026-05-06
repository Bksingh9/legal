import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrder } from "@/lib/razorpay/client";
import { getSkuMeta, LAWYER_REVIEW_ADDON_PAISE } from "@/lib/skus";
import { getCurrentUserId } from "@/lib/triage/persistence";
import { getDocumentForUser } from "@/lib/documents/persistence";
import { upsertCreatedPayment } from "@/lib/payments/persistence";

export const runtime = "nodejs";

const Body = z.object({
  document_id: z.string().min(1).max(64),
  idempotency_key: z.string().min(8).max(80)
});

export async function POST(req: Request) {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const userId = await getCurrentUserId();
  // For mock mode without Supabase, allow checkout-shaped responses for
  // local UI testing.
  if (!userId && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "Sign in." }, { status: 401 });
  }

  let sku: string | null = null;
  let priceTotalPaise = 0;
  let addonLawyerReview = false;

  if (userId && !parsed.document_id.startsWith("doc_mock_")) {
    const doc = await getDocumentForUser({
      userId,
      documentId: parsed.document_id
    });
    if (!doc) return NextResponse.json({ error: "Document not found." }, { status: 404 });
    if (doc.paid) return NextResponse.json({ error: "Already paid." }, { status: 409 });
    sku = doc.sku ?? doc.type;
    priceTotalPaise = doc.price_paise;
    addonLawyerReview = doc.addon_lawyer_review;
  } else {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Mock mode: configure Supabase to create real document drafts before requesting an order."
      },
      { status: 400 }
    );
  }

  const meta = sku ? getSkuMeta(sku) : null;
  if (!meta) return NextResponse.json({ error: "Unknown SKU." }, { status: 400 });

  if (addonLawyerReview) priceTotalPaise += LAWYER_REVIEW_ADDON_PAISE;

  const order = await createOrder({
    amount_paise: priceTotalPaise,
    receipt: `doc_${parsed.document_id.slice(0, 24)}`,
    notes: {
      document_id: parsed.document_id,
      sku: meta.id,
      addon_lawyer_review: addonLawyerReview ? "1" : "0",
      user_id: userId ?? "anon"
    }
  });

  if (userId) {
    await upsertCreatedPayment({
      userId,
      documentId: parsed.document_id,
      sku: meta.id,
      amount_paise: priceTotalPaise,
      razorpay_order_id: order.id,
      idempotency_key: parsed.idempotency_key
    });
  }

  return NextResponse.json({
    ok: true,
    order_id: order.id,
    amount_paise: order.amount,
    currency: order.currency,
    razorpay_key_id: process.env.RAZORPAY_KEY_ID ?? null
  });
}
