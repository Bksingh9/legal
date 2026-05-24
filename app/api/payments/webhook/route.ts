import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay/client";
import {
  getPaymentByOrderId,
  markCaptured
} from "@/lib/payments/persistence";
import { finalizePaidDocument } from "@/lib/payments/finalize";
import { maybeCreditFirstPaid } from "@/lib/referrals/persistence";

export const runtime = "nodejs";

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        currency: string;
        status: string;
      };
    };
    subscription?: {
      entity: {
        id: string;
        status: string;
        current_end: number;
      };
    };
    refund?: {
      entity: {
        id: string;
        payment_id: string;
        amount: number;
        status: string;
      };
    };
  };
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(raw, signature)) {
    console.warn("[payments/webhook] bad signature");
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let body: RazorpayWebhookPayload;
  try {
    body = JSON.parse(raw) as RazorpayWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  // Subscription lifecycle events.
  if (
    body.event === "subscription.activated" ||
    body.event === "subscription.charged" ||
    body.event === "subscription.cancelled" ||
    body.event === "subscription.completed" ||
    body.event === "subscription.halted"
  ) {
    const sub = body.payload.subscription?.entity;
    if (sub) {
      const { getSupabaseServiceClient } = await import("@/lib/supabase/server");
      const supa = getSupabaseServiceClient();
      if (supa) {
        let nextStatus: "active" | "past_due" | "cancelled" | "expired" = "active";
        if (sub.status === "halted" || sub.status === "pending") nextStatus = "past_due";
        else if (sub.status === "cancelled") nextStatus = "cancelled";
        else if (sub.status === "completed" || sub.status === "expired") nextStatus = "expired";

        await supa
          .from("subscriptions")
          .update({
            status: nextStatus,
            paid_until: sub.current_end
              ? new Date(sub.current_end * 1000).toISOString()
              : null
          })
          .eq("razorpay_subscription_id", sub.id);
      }
    }
    return NextResponse.json({ ok: true, handled: body.event });
  }

  // Refund processed by Razorpay (could be admin-initiated via our
  // /api/admin/payments/[id]/refund route or via Razorpay dashboard).
  if (body.event === "refund.processed" || body.event === "refund.created") {
    const refund = body.payload.refund?.entity;
    if (refund) {
      const { getSupabaseServiceClient } = await import("@/lib/supabase/server");
      const supa = getSupabaseServiceClient();
      if (supa) {
        await supa
          .from("payments")
          .update({ status: "refunded" })
          .eq("razorpay_payment_id", refund.payment_id);
      }
    }
    return NextResponse.json({ ok: true, handled: body.event });
  }

  if (body.event !== "payment.captured") {
    // Acknowledge other events without acting.
    return NextResponse.json({ ok: true, ignored: body.event });
  }

  const payment = body.payload.payment?.entity;
  if (!payment) return NextResponse.json({ error: "No payment entity." }, { status: 400 });

  const row = await getPaymentByOrderId(payment.order_id);
  if (!row) {
    // Service not yet wired (mock mode) — acknowledge to avoid retries.
    console.warn("[payments/webhook] no payment row", payment.order_id);
    return NextResponse.json({ ok: true, persisted: false });
  }

  await markCaptured({ orderId: payment.order_id, paymentId: payment.id });

  // First paid transaction credits the referrer (idempotent, no-op if the
  // payer wasn't referred or was already credited).
  await maybeCreditFirstPaid(row.user_id);

  if (!row.document_id) {
    return NextResponse.json({ ok: true, captured: true });
  }

  // Finalize the document. Failures here should not 5xx the webhook —
  // Razorpay retries indefinitely; finalizePaidDocument logs and the row is
  // reconciled via an admin job.
  const result = await finalizePaidDocument(row.document_id);

  return NextResponse.json({
    ok: true,
    captured: true,
    finalized: result.finalized,
    pdf_url: result.pdfUrl,
    docx_url: result.docxUrl,
    lawyer_review_id: result.lawyerReviewId
  });
}
