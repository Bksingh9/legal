import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/role";
import { suspendLawyer } from "@/lib/lawyers/persistence";

export const runtime = "nodejs";

const Body = z.object({ reason: z.string().trim().min(8).max(2000) });

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.reason },
      { status: gate.reason === "unauthenticated" ? 401 : 403 }
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Provide a suspension reason." }, { status: 400 });
  }

  const updated = await suspendLawyer({
    lawyerId: params.id,
    reviewerId: gate.userId,
    reason: body.reason
  });
  if (!updated) {
    return NextResponse.json({ error: "Lawyer not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, lawyer_id: updated.id, status: updated.status });
}
