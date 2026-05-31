import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/role";
import { updateOrganization } from "@/lib/orgs/persistence";
import { ORG_PLAN_IDS } from "@/lib/orgs/plans";

export const runtime = "nodejs";

const PatchBody = z
  .object({
    plan: z.enum(ORG_PLAN_IDS as [string, ...string[]]).optional(),
    status: z.enum(["active", "suspended"]).optional()
  })
  .refine((b) => b.plan !== undefined || b.status !== undefined, {
    message: "Provide plan and/or status."
  });

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: gate.reason === "unauthenticated" ? 401 : 403 });
  }
  let parsed: z.infer<typeof PatchBody>;
  try {
    parsed = PatchBody.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const org = await updateOrganization(params.id, {
    plan: parsed.plan as (typeof ORG_PLAN_IDS)[number] | undefined,
    status: parsed.status
  });
  if (!org) return NextResponse.json({ error: "Update failed." }, { status: 500 });
  return NextResponse.json({ ok: true, organization: org });
}
