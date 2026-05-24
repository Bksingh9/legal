import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/role";
import { listOrganizations, createOrganization } from "@/lib/orgs/persistence";
import { ORG_PLAN_IDS } from "@/lib/orgs/plans";

export const runtime = "nodejs";

const CreateBody = z.object({
  name: z.string().trim().min(2).max(120),
  plan: z.enum(ORG_PLAN_IDS as [string, ...string[]]).default("starter"),
  owner_user_id: z.string().uuid().optional()
});

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: gate.reason === "unauthenticated" ? 401 : 403 });
  }
  return NextResponse.json({ ok: true, organizations: await listOrganizations() });
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: gate.reason === "unauthenticated" ? 401 : 403 });
  }
  let parsed: z.infer<typeof CreateBody>;
  try {
    parsed = CreateBody.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const org = await createOrganization({
    name: parsed.name,
    plan: parsed.plan as (typeof ORG_PLAN_IDS)[number],
    ownerUserId: parsed.owner_user_id ?? null
  });
  if (!org) return NextResponse.json({ error: "Create failed." }, { status: 500 });
  return NextResponse.json({ ok: true, organization: org }, { status: 201 });
}
