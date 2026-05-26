import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { fetchSubscription } from "@/lib/razorpay/client";
import { notifyUser } from "@/lib/notify/inbox";
import { checkCronAuth } from "@/lib/cron/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Daily subscription-renewal sweep. Reads every subscription whose
// paid_until is past, asks Razorpay for the current state, mirrors
// the result into our DB, notifies the user on terminal transitions.
//
// Triggered by Vercel Cron (GET + Authorization: Bearer CRON_SECRET) via the
// schedule in vercel.json. Unconfigured (no secret) falls through to the
// read-only mock path below.
export async function GET(req: Request) {
  const { authorized, configured } = checkCronAuth(req);
  if (configured && !authorized) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const supa = getSupabaseServiceClient();
  if (!supa) {
    return NextResponse.json({ ok: true, swept: 0, mock: true });
  }

  const { data: due } = await supa
    .from("subscriptions")
    .select("id, user_id, plan, status, razorpay_subscription_id, paid_until")
    .lt("paid_until", new Date().toISOString())
    .in("status", ["active", "past_due"])
    .limit(200);

  let updated = 0;
  for (const row of due ?? []) {
    if (!row.razorpay_subscription_id) continue;
    const remote = await fetchSubscription(row.razorpay_subscription_id);
    if (!remote) continue;

    let newStatus = row.status;
    let paidUntil = row.paid_until;
    if (remote.status === "active" || remote.status === "authenticated") {
      newStatus = "active";
      if (remote.current_end) {
        paidUntil = new Date(remote.current_end * 1000).toISOString();
      }
    } else if (remote.status === "halted" || remote.status === "pending") {
      newStatus = "past_due";
    } else if (
      remote.status === "cancelled" ||
      remote.status === "completed" ||
      remote.status === "expired"
    ) {
      newStatus = remote.status === "completed" ? "expired" : remote.status;
    }

    await supa
      .from("subscriptions")
      .update({ status: newStatus, paid_until: paidUntil })
      .eq("id", row.id);

    if (newStatus !== row.status) {
      await notifyUser({
        userId: row.user_id,
        kind: newStatus === "active" ? "consultation.scheduled" : "consultation.finished",
        title:
          newStatus === "active"
            ? "LegalDesk Plus renewed"
            : newStatus === "past_due"
              ? "Plus payment failed"
              : "Plus subscription ended",
        body:
          newStatus === "active"
            ? `Active until ${paidUntil?.slice(0, 10) ?? "next cycle"}.`
            : newStatus === "past_due"
              ? "Retry happening shortly. Update your card if needed."
              : "Resubscribe any time from /pricing.",
        link: "/pricing"
      });
      updated++;
    }
  }

  return NextResponse.json({ ok: true, swept: due?.length ?? 0, updated });
}
