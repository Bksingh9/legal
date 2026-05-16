import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/triage/persistence";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { isValidUtr } from "@/lib/upi/deeplink";
import { notifyMany, getAdminUserIds } from "@/lib/notify/inbox";

export const runtime = "nodejs";

const Body = z.object({
  payment_id: z.string().uuid(),
  utr: z
    .string()
    .trim()
    .min(12)
    .max(22)
    .transform((s) => s.toUpperCase())
});

// User submits the 12-digit UTR after paying via UPI. We persist it and
// flip status to 'pending_verification'. An admin reconciles weekly
// against the bank statement and flips to 'captured' via
// /api/admin/payments/[id]/verify.
export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Sign in." }, { status: 401 });

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  if (!isValidUtr(parsed.utr)) {
    return NextResponse.json(
      { error: "UTR should be 12-22 alphanumeric characters." },
      { status: 400 }
    );
  }

  const supa = getSupabaseServiceClient();
  if (!supa) return NextResponse.json({ error: "Storage unavailable." }, { status: 500 });

  // Read row + assert ownership.
  const { data: payment, error: readErr } = await supa
    .from("payments")
    .select("id, user_id, status, method, amount")
    .eq("id", parsed.payment_id)
    .maybeSingle();
  if (readErr || !payment) {
    return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  }
  if (payment.user_id !== userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (payment.method !== "upi") {
    return NextResponse.json({ error: "Not a UPI payment." }, { status: 409 });
  }
  if (payment.status === "captured") {
    return NextResponse.json({ ok: true, already: true });
  }

  const { error: updErr } = await supa
    .from("payments")
    .update({
      upi_utr: parsed.utr,
      upi_submitted_at: new Date().toISOString(),
      status: "pending_verification"
    })
    .eq("id", parsed.payment_id);
  if (updErr) {
    if (updErr.code === "23505") {
      return NextResponse.json(
        { error: "That UTR is already on file." },
        { status: 409 }
      );
    }
    console.error("[upi-confirm] update failed", updErr);
    return NextResponse.json({ error: "Save failed." }, { status: 500 });
  }

  // Notify admins so they know to reconcile.
  const adminIds = await getAdminUserIds();
  if (adminIds.length > 0) {
    await notifyMany(adminIds, {
      kind: "lawyer.application.new", // reuse: an "admin needs to look" kind
      title: "UPI payment awaiting verification",
      body: `₹${(payment.amount / 100).toFixed(0)} · UTR ${parsed.utr}`,
      link: "/admin/payments"
    });
  }

  return NextResponse.json({ ok: true });
}
