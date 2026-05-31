import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/role";
import { revokeApiKey } from "@/lib/orgs/persistence";

export const runtime = "nodejs";

export async function DELETE(_req: Request, props: { params: Promise<{ id: string; keyId: string }> }) {
  const params = await props.params;
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: gate.reason === "unauthenticated" ? 401 : 403 });
  }
  const ok = await revokeApiKey(params.id, params.keyId);
  if (!ok) return NextResponse.json({ error: "Revoke failed." }, { status: 500 });
  return NextResponse.json({ ok: true, revoked: params.keyId });
}
