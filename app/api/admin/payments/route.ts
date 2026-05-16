import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/role";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin: list payments awaiting UPI reconciliation. Status flow for the
// UPI path: created → pending_verification → captured (or 'failed').
export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.reason },
      { status: gate.reason === "unauthenticated" ? 401 : 403 }
    );
  }

  const supa = getSupabaseServiceClient();
  if (!supa) return NextResponse.json({ ok: true, items: [] });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "pending_verification";

  const { data, error } = await supa
    .from("payments")
    .select(
      "id, user_id, amount, status, sku, method, upi_vpa, upi_utr, upi_submitted_at, verified_by, verified_at, created_at"
    )
    .eq("method", "upi")
    .eq("status", status)
    .order("upi_submitted_at", { ascending: false, nullsFirst: false })
    .limit(100);
  if (error) {
    console.error("[admin/payments] list failed", error);
    return NextResponse.json({ error: "List failed." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, items: data ?? [] });
}
