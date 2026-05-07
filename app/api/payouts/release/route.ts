import { NextResponse, type NextRequest } from "next/server";
import { listConsultsAwaitingPayout, markPayoutReleased } from "@/lib/consult/persistence";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Cron-callable. Protect with a shared secret in the X-Cron-Secret header.
// CRON_SECRET should be set in Vercel project env. The same secret is
// configured on the cron source (Vercel Cron, GitHub Actions, etc.).
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured." },
      { status: 503 }
    );
  }
  if (req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const dryRun = req.nextUrl.searchParams.get("dry_run") === "1";
  const consults = await listConsultsAwaitingPayout();

  const released: Array<{ consultation_id: string; transfer_id: string; amount_paise: number }> = [];
  for (const c of consults) {
    if (!c.lawyer_id || !c.payout_lawyer_inr) continue;
    if (c.status !== "completed") continue;

    if (dryRun) {
      released.push({
        consultation_id: c.id,
        transfer_id: "(dry-run)",
        amount_paise: c.payout_lawyer_inr
      });
      continue;
    }

    const transferId = await issueRouteTransfer({
      lawyerId: c.lawyer_id,
      consultationId: c.id,
      amount_paise: c.payout_lawyer_inr
    });
    if (!transferId) continue;
    await markPayoutReleased({ consultationId: c.id, transferId });
    released.push({
      consultation_id: c.id,
      transfer_id: transferId,
      amount_paise: c.payout_lawyer_inr
    });
  }

  return NextResponse.json({
    ok: true,
    dry_run: dryRun,
    candidates: consults.length,
    released: released.length,
    items: released
  });
}

async function issueRouteTransfer(args: {
  lawyerId: string;
  consultationId: string;
  amount_paise: number;
}): Promise<string | null> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  // Look up the lawyer's route_account_id from the service-role client.
  const supa = getSupabaseServiceClient();
  if (!supa) return null;
  const { data, error } = await supa
    .from("lawyers")
    .select("route_account_id")
    .eq("id", args.lawyerId)
    .maybeSingle();
  if (error || !data) {
    console.error("[payouts] lawyer lookup", error);
    return null;
  }
  const routeAccountId = (data as { route_account_id: string | null }).route_account_id;
  if (!routeAccountId) return null;

  if (!keyId || !keySecret || routeAccountId.startsWith("acc_mock_")) {
    return `transfer_mock_${args.consultationId.slice(0, 8)}`;
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/transfers", {
    method: "POST",
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      account: routeAccountId,
      amount: args.amount_paise,
      currency: "INR",
      notes: { consultation_id: args.consultationId }
    })
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("[payouts] transfer failed", res.status, text.slice(0, 300));
    return null;
  }
  const transfer = (await res.json()) as { id?: string };
  return transfer.id ?? null;
}
