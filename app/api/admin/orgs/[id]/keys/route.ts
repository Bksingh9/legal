import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/role";
import { listApiKeys, createApiKey } from "@/lib/orgs/persistence";
import { API_SCOPES, type ApiScope } from "@/lib/orgs/api-key";

export const runtime = "nodejs";

const CreateBody = z.object({
  name: z.string().trim().min(2).max(80),
  scopes: z.array(z.enum(API_SCOPES as unknown as [string, ...string[]])).min(1)
});

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: gate.reason === "unauthenticated" ? 401 : 403 });
  }
  return NextResponse.json({ ok: true, keys: await listApiKeys(params.id) });
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
  const created = await createApiKey({
    orgId: params.id,
    name: parsed.name,
    scopes: parsed.scopes as ApiScope[]
  });
  if (!created) return NextResponse.json({ error: "Create failed." }, { status: 500 });
  // The plaintext token is returned exactly once; it is not recoverable later.
  return NextResponse.json({ ok: true, key: created.row, token: created.token }, { status: 201 });
}
