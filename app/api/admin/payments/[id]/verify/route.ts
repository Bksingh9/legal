import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/role";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/notify/inbox";
import { finalizePaidDocument } from "@/lib/payments/finalize";
import { maybeCreditFirstPaid } from "@/lib/referrals/persistence";

export const runtime = "nodejs";

const Body = z.object({
  action: z.enum(["verify", "reject"]),
  reason: z.string().trim().max(2000).optional()
});

// Admin marks a UPI payment verified (matched against the bank
// statement) or rejected. Flips payments.status to 'captured' or
// 'failed' and notifies the paying user.
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
    .select("id, user_id, document_id, amount, method, status")
    .eq("id", params.id)
    .maybeSingle();
  if (!payment) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (payment.method !== "upi") {
    return NextResponse.json({ error: "Not a UPI payment." }, { status: 409 });
  }

  const now = new Date().toISOString();
  const nextStatus = parsed.action === "verify" ? "captured" : "failed";
  const { error: updErr } = await supa
    .from("payments")
    .update({
      status: nextStatus,
      verified_by: gate.userId,
      verified_at: now
    })
    .eq("id", params.id);
  if (updErr) {
    console.error("[admin/payments/verify] update failed", updErr);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }

  // On verify, deliver the document and fire referral credit — mirrors the
  // Razorpay webhook capture path so UPI buyers get the same outcome.
  let finalized: boolean | undefined;
  if (parsed.action === "verify") {
    await maybeCreditFirstPaid(payment.user_id);
    if (payment.document_id) {
      const result = await finalizePaidDocument(payment.document_id);
      finalized = result.finalized;
    }
  }

  // Notify the user.
  await notifyUser({
    userId: payment.user_id,
    kind: parsed.action === "verify" ? "consultation.scheduled" : "consultation.finished",
    title:
      parsed.action === "verify"
        ? "Payment verified"
        : "Payment could not be verified",
    body:
      parsed.action === "verify"
        ? `Your ₹${(payment.amount / 100).toFixed(0)} UPI payment is confirmed.`
        : parsed.reason?.slice(0, 200) ?? "We could not match your UTR. Please re-submit.",
    link: "/account"
  });

  return NextResponse.json({ ok: true, status: nextStatus, finalized });
}
