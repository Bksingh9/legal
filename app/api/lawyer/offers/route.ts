import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/triage/persistence";
import { getLawyerByUserId, listOffersForLawyer } from "@/lib/consult/persistence";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: "Sign in." }, { status: 401 });
    }
    return NextResponse.json({ ok: true, mock: true, offers: [] });
  }
  const lw = await getLawyerByUserId(userId);
  if (!lw) return NextResponse.json({ error: "Not a lawyer." }, { status: 403 });
  if (lw.status !== "verified") {
    return NextResponse.json({ ok: true, offers: [], note: "Application not yet verified." });
  }

  const offers = await listOffersForLawyer({ lawyerId: lw.id, status: "pending" });
  // Hydrate with consultation summary fields without leaking the user's name.
  const supa = getSupabaseServiceClient();
  let consults: Record<string, { specialization: string | null; language: string | null; state: string | null; pack: string | null }> = {};
  if (supa && offers.length > 0) {
    const ids = offers.map((o) => o.consultation_id);
    const { data } = await supa
      .from("consultations")
      .select("id, specialization, language, state, pack")
      .in("id", ids);
    for (const row of (data as Array<{ id: string; specialization: string | null; language: string | null; state: string | null; pack: string | null }>) ?? []) {
      consults[row.id] = {
        specialization: row.specialization,
        language: row.language,
        state: row.state,
        pack: row.pack
      };
    }
  }

  return NextResponse.json({
    ok: true,
    offers: offers.map((o) => ({
      id: o.id,
      consultation_id: o.consultation_id,
      sent_at: o.sent_at,
      expires_at: o.expires_at,
      ...consults[o.consultation_id]
    }))
  });
}
