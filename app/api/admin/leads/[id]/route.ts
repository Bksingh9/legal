import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/role";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const Body = z.object({
  action: z.enum(["mark_called", "drop"])
});

// Admin actions on a single lead. The "convert" action is handled by
// the existing /api/consultations/book endpoint plus a follow-up PATCH
// here to link the lead to the resulting consultation.
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
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const supa = getSupabaseServiceClient();
  if (!supa) return NextResponse.json({ error: "Storage unavailable." }, { status: 500 });

  const now = new Date().toISOString();
  const nextStatus = parsed.action === "mark_called" ? "called" : "dropped";
  const { error } = await supa
    .from("consultation_leads")
    .update({
      status: nextStatus,
      handled_by: gate.userId,
      handled_at: now
    })
    .eq("id", params.id);
  if (error) {
    console.error("[admin/leads/action] update failed", error);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, status: nextStatus });
}
