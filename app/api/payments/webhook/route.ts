import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay/client";
import {
  getPaymentByOrderId,
  markCaptured
} from "@/lib/payments/persistence";
import {
  getDocumentById,
  updateDocumentDelivered
} from "@/lib/documents/persistence";
import { renderForSku } from "@/lib/templates";
import { renderDocumentPdf } from "@/lib/pdf/document-render";
import { renderDocumentDocx } from "@/lib/docx/document-render";
import { uploadDocumentArtefacts } from "@/lib/storage/documents";
import { sendEmail } from "@/lib/notify/email";
import { sendWhatsAppDocument } from "@/lib/notify/whatsapp";
import { createLawyerReview } from "@/lib/lawyer-reviews/persistence";
import { getUserContact } from "@/lib/users/persistence";

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

  if (!row.document_id) {
    return NextResponse.json({ ok: true, captured: true });
  }

  const doc = await getDocumentById(row.document_id);
  if (!doc || !doc.sku) {
    return NextResponse.json({ ok: true, captured: true, finalized: false });
  }

  // Finalize the document. Failures here should not 5xx the webhook —
  // Razorpay retries indefinitely; we'd rather mark the row partially
  // delivered and reconcile via an admin job.
  let pdfUrl: string | null = null;
  let docxUrl: string | null = null;
  let lawyerReviewId: string | null = null;

  try {
    const rendered = renderForSku(doc.sku, doc.input_json, {
      reference: doc.id,
      generated_at: new Date().toISOString()
    });
    const [pdf, docx] = await Promise.all([
      renderDocumentPdf(rendered),
      renderDocumentDocx(rendered)
    ]);
    const uploaded = await uploadDocumentArtefacts({
      userId: doc.user_id,
      documentId: doc.id,
      pdf,
      docx
    });
    pdfUrl = uploaded.pdfUrl;
    docxUrl = uploaded.docxUrl;

    if (doc.addon_lawyer_review) {
      const review = await createLawyerReview({
        userId: doc.user_id,
        documentId: doc.id
      });
      lawyerReviewId = review?.id ?? null;
    }

    await updateDocumentDelivered({
      documentId: doc.id,
      pdfUrl,
      docxUrl,
      lawyerReviewId
    });

    const contact = await getUserContact(doc.user_id);
    if (contact?.email && pdfUrl) {
      await sendEmail({
        to: contact.email,
        subject: "Your LegalDesk document is ready",
        html: renderDeliveryEmail({
          name: contact.name ?? "there",
          sku: doc.sku,
          pdfUrl,
          docxUrl,
          lawyerReview: !!lawyerReviewId
        }),
        attachments: [{ filename: `${doc.sku}.pdf`, content: pdf }]
      });
    }
    if (contact?.phone) {
      await sendWhatsAppDocument({
        to_phone: contact.phone,
        campaign_name: "document_delivery",
        user_name: contact.name ?? "Customer",
        template_params: [doc.sku],
        media_url: pdfUrl ?? undefined
      });
    }
  } catch (err) {
    console.error("[payments/webhook] finalize failed", err);
  }

  return NextResponse.json({
    ok: true,
    captured: true,
    finalized: !!pdfUrl,
    pdf_url: pdfUrl,
    docx_url: docxUrl,
    lawyer_review_id: lawyerReviewId
  });
}

function renderDeliveryEmail(args: {
  name: string;
  sku: string;
  pdfUrl: string;
  docxUrl: string | null;
  lawyerReview: boolean;
}): string {
  const reviewLine = args.lawyerReview
    ? "<p>You added the lawyer-review add-on. A qualified advocate will review your document and get back to you within 24 hours.</p>"
    : "";
  return `
    <p>Hello ${escapeHtml(args.name)},</p>
    <p>Your <strong>${escapeHtml(args.sku)}</strong> document is ready.</p>
    <ul>
      <li><a href="${args.pdfUrl}">Download PDF</a></li>
      ${args.docxUrl ? `<li><a href="${args.docxUrl}">Download DOCX</a></li>` : ""}
    </ul>
    ${reviewLine}
    <p style="color:#666;font-size:12px;margin-top:24px">
      Generated by LegalDesk AI. Not legal advice. Consult a qualified advocate
      for case-specific opinion.
    </p>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
