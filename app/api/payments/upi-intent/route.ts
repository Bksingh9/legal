import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { getCurrentUserId } from "@/lib/triage/persistence";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { buildUpiDeepLink, getUpiConfig } from "@/lib/upi/deeplink";
import { getDocumentForUser } from "@/lib/documents/persistence";
import { getSkuMeta, LAWYER_REVIEW_ADDON_PAISE } from "@/lib/skus";

export const runtime = "nodejs";

const Body = z.object({
  document_id: z.string().min(1).max(64).optional(),
  consultation_id: z.string().uuid().optional(),
  idempotency_key: z.string().min(8).max(80)
});

// Creates a UPI payment intent: writes a `payments` row in status='created'
// with method='upi', returns the upi:// deep link and a tx_ref the user
// can quote when they submit their UTR.
export async function POST(req: Request) {
  const cfg = getUpiConfig();
  if (!cfg) {
    return NextResponse.json(
      { error: "UPI not configured. Set UPI_VPA + UPI_MERCHANT_NAME." },
      { status: 503 }
    );
  }

  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Sign in." }, { status: 401 });

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  if (!parsed.document_id && !parsed.consultation_id) {
    return NextResponse.json(
      { error: "Provide document_id or consultation_id." },
      { status: 400 }
    );
  }

  const supa = getSupabaseServiceClient();
  if (!supa) return NextResponse.json({ error: "Storage unavailable." }, { status: 500 });

  let amountPaise = 0;
  let sku: string | null = null;
  let txNote = "";

  if (parsed.document_id) {
    const doc = await getDocumentForUser({
      userId,
      documentId: parsed.document_id
    });
    if (!doc) return NextResponse.json({ error: "Document not found." }, { status: 404 });
    if (doc.paid) return NextResponse.json({ error: "Already paid." }, { status: 409 });
    sku = doc.sku ?? doc.type;
    amountPaise = doc.price_paise + (doc.addon_lawyer_review ? LAWYER_REVIEW_ADDON_PAISE : 0);
    const meta = sku ? getSkuMeta(sku) : null;
    txNote = `${meta?.title ?? "Document"}`;
  } else if (parsed.consultation_id) {
    const { data: consult } = await supa
      .from("consultations")
      .select("amount_inr, pack, user_id")
      .eq("id", parsed.consultation_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!consult) return NextResponse.json({ error: "Consultation not found." }, { status: 404 });
    amountPaise = consult.amount_inr;
    txNote = `Consultation ${consult.pack ?? ""}`.trim();
  }

  if (amountPaise <= 0) {
    return NextResponse.json({ error: "Amount is zero." }, { status: 400 });
  }

  // Short reference the user can quote on the bank statement.
  const txRef = "LD" + randomBytes(6).toString("hex").toUpperCase();

  const { data: row, error } = await supa
    .from("payments")
    .upsert(
      {
        user_id: userId,
        method: "upi",
        amount: amountPaise,
        status: "created",
        sku: sku ?? "consultation",
        idempotency_key: parsed.idempotency_key,
        upi_vpa: cfg.vpa,
        razorpay_order_id: txRef // reuse the column to store our tx_ref
      },
      { onConflict: "idempotency_key" }
    )
    .select("*")
    .single();
  if (error || !row) {
    console.error("[upi-intent] persist failed", error);
    return NextResponse.json({ error: "Could not create UPI intent." }, { status: 500 });
  }

  const url = buildUpiDeepLink({
    vpa: cfg.vpa,
    merchantName: cfg.merchantName,
    amountInr: amountPaise / 100,
    txNote,
    txRef
  });

  return NextResponse.json({
    ok: true,
    payment_id: row.id,
    upi_url: url,
    amount_paise: amountPaise,
    vpa: cfg.vpa,
    merchant_name: cfg.merchantName,
    tx_ref: txRef
  });
}
