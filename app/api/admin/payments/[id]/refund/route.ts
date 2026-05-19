import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/role";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { refundPayment } from "@/lib/razorpay/client";
import { notifyUser } from "@/lib/notify/inbox";

export const runtime = "nodejs";

const Body = z.object({
  amount_paise: z.number().int().min(1).max(1_00_00_00_000).optional(),
  reason: z.string().trim().max(2000).optional()
});

// Admin-initiated refund. Works for Razorpay-rail payments
// (method='razorpay' OR null with razorpay_payment_id set). UPI
// reconciliation refunds happen out-of-band (bank-level reversal),
// not via this endpoint.
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.reason },
      { status: gate.reason === "unauthenticated" ? 401 : 403 }
    );
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json().catch(() => ({})));
  } catch {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const supa = getSupabaseServiceClient();
  if (!supa) return NextResponse.json({ error: "Storage unavailable." }, { status: 500 });

  const { data: payment } = await supa
    .from("payments")
    .select("id, user_id, amount, status, method, razorpay_payment_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!payment) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (payment.method === "upi") {
    return NextResponse.json(
      { error: "UPI payments must be refunded via bank reversal; mark this row 'refunded' once done." },
      { status: 409 }
    );
  }
  if (payment.status !== "captured") {
    return NextResponse.json(
      { error: "Only captured payments can be refunded." },
      { status: 409 }
    );
  }
  if (!payment.razorpay_payment_id) {
    return NextResponse.json(
      { error: "Missing razorpay_payment_id on this row." },
      { status: 409 }
    );
  }

  let refund;
  try {
    refund = await refundPayment({
      payment_id: payment.razorpay_payment_id,
      amount_paise: parsed.amount_paise,
      notes: parsed.reason ? { reason: parsed.reason } : undefined
    });
  } catch (err) {
    console.error("[admin/payments/refund] razorpay failed", err);
    return NextResponse.json({ error: "Refund failed at Razorpay." }, { status: 502 });
  }

  const { error: updErr } = await supa
    .from("payments")
    .update({
      status: "refunded",
      verified_by: gate.userId,
      verified_at: new Date().toISOString()
    })
    .eq("id", params.id);
  if (updErr) {
    console.error("[admin/payments/refund] db update failed", updErr);
    // Don't 5xx — refund already succeeded at Razorpay.
  }

  await notifyUser({
    userId: payment.user_id,
    kind: "consultation.finished", // reuse — kinds are display labels
    title: "Refund processed",
    body: `Your payment of ₹${(payment.amount / 100).toFixed(0)} has been refunded.${parsed.reason ? ` (${parsed.reason.slice(0, 120)})` : ""}`,
    link: "/account"
  });

  return NextResponse.json({
    ok: true,
    refund_id: refund.id,
    refund_status: refund.status,
    payment_status: "refunded"
  });
}
