import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/role";
import { listLawyersByStatus } from "@/lib/lawyers/persistence";

export const runtime = "nodejs";

const StatusFilter = z.enum(["pending", "verified", "suspended"]);

export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.reason },
      { status: gate.reason === "unauthenticated" ? 401 : 403 }
    );
  }

  const status = req.nextUrl.searchParams.get("status") ?? "pending";
  const parsed = StatusFilter.safeParse(status);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const lawyers = await listLawyersByStatus({ status: parsed.data });

  return NextResponse.json({
    ok: true,
    mock: gate.mock,
    status: parsed.data,
    count: lawyers.length,
    lawyers: lawyers.map((l) => ({
      id: l.id,
      anon_slug: l.anon_slug,
      bar_council_id: l.bar_council_id, // admin sees the real BCI ID
      state: l.state,
      specializations: l.specializations,
      languages: l.languages,
      years_exp: l.years_exp,
      rating: l.rating,
      status: l.status,
      route_account_id: l.route_account_id,
      digilocker_uri: l.digilocker_uri,
      created_at: l.created_at,
      verified_at: l.verified_at,
      suspended_at: l.suspended_at,
      suspension_reason: l.suspension_reason
    }))
  });
}
