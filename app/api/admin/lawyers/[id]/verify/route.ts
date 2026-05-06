import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/role";
import { verifyLawyer } from "@/lib/lawyers/persistence";

export const runtime = "nodejs";

const Body = z.object({ notes: z.string().trim().max(2000).optional() });

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

  let body: z.infer<typeof Body> = {};
  try {
    body = Body.parse(await req.json().catch(() => ({})));
  } catch {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const updated = await verifyLawyer({
    lawyerId: params.id,
    reviewerId: gate.userId,
    notes: body.notes
  });
  if (!updated) {
    return NextResponse.json({ error: "Lawyer not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, lawyer_id: updated.id, status: updated.status });
}
