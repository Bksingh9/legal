import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/role";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin: list consult_leads. Default to status='new'; ?status= filter
// supports the other lifecycle states.
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
  const status = url.searchParams.get("status") ?? "new";

  const { data, error } = await supa
    .from("consultation_leads")
    .select(
      "id, name, phone, email, city, issue, inferred_specialization, status, handled_by, handled_at, user_id, consultation_id, created_at"
    )
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("[admin/leads] list failed", error);
    return NextResponse.json({ error: "List failed." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, items: data ?? [] });
}
