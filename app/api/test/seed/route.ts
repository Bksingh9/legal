import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import {
  createOrganization,
  listApiKeys,
  createApiKey,
  revokeApiKey,
  type OrgRow
} from "@/lib/orgs/persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Disposable QA fixture — provisions a known-state admin + buyer + B2B
// org + API key so unattended QA can exercise /admin/orgs and the full
// signed-in UPI purchase -> verify -> deliver flow without manual login.
// Idempotent: re-running converges on the same fixtures and re-mints the
// API key (the plaintext token can only be shown once).
//
// SECURITY: this endpoint MINTS AN ADMIN ACCOUNT. It is 404'd unless
// QA_TEST_SECRET is set AND the caller presents it as `x-qa-test-secret`.
// Treat QA_TEST_SECRET like CRON_SECRET: long random string, kept only in
// the QA runner's secret store, rotated on incident.

const ADMIN_EMAIL = "qa-seed-admin+ci@legaldesk.ai"; // @legaldesk.ai -> role=admin via handle_new_auth_user trigger
const BUYER_EMAIL = "qa-seed-buyer+ci@legaldesk-test.ai"; // non-@legaldesk.ai -> role=user
const ORG_NAME = "QA Seed Org";
const ORG_SLUG = "qa-seed-org";

function authorize(req: Request): boolean {
  const secret = process.env.QA_TEST_SECRET;
  if (!secret) return false;
  const presented = req.headers.get("x-qa-test-secret") ?? "";
  const a = Buffer.from(secret);
  const b = Buffer.from(presented);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// Deterministic per-email password derived from QA_TEST_SECRET, so the QA
// runner doesn't have to cache previously-returned credentials.
function derivePassword(secret: string, email: string): string {
  return createHash("sha256").update(`${secret}:${email}`).digest("base64url").slice(0, 24);
}

type Supa = NonNullable<ReturnType<typeof getSupabaseServiceClient>>;
interface AuthUser { id: string; email: string | null }

async function ensureUser(supa: Supa, email: string, password: string): Promise<AuthUser | null> {
  const created = await supa.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.data?.user) {
    return { id: created.data.user.id, email: created.data.user.email ?? null };
  }
  // Already exists — look up and reset password so the deterministic
  // derivation stays valid even if QA_TEST_SECRET was rotated.
  const list = await supa.auth.admin.listUsers({ page: 1, perPage: 200 });
  const found = list.data?.users?.find(
    (u) => (u.email ?? "").toLowerCase() === email.toLowerCase()
  );
  if (!found) return null;
  await supa.auth.admin.updateUserById(found.id, { password });
  return { id: found.id, email: found.email ?? null };
}

export async function POST(req: Request) {
  if (!authorize(req)) {
    // 404 (not 401/403) to keep the surface invisible when the secret is unset.
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const supa = getSupabaseServiceClient();
  if (!supa) return NextResponse.json({ error: "no_supabase" }, { status: 503 });

  const secret = process.env.QA_TEST_SECRET!;
  const adminPwd = derivePassword(secret, ADMIN_EMAIL);
  const buyerPwd = derivePassword(secret, BUYER_EMAIL);

  const admin = await ensureUser(supa, ADMIN_EMAIL, adminPwd);
  const buyer = await ensureUser(supa, BUYER_EMAIL, buyerPwd);
  if (!admin || !buyer) {
    return NextResponse.json({ error: "auth_provision_failed" }, { status: 500 });
  }

  // Find-by-slug or create. createOrganization suffixes on slug collision,
  // which would break idempotency; probe explicitly first.
  const { data: existing } = await supa
    .from("organizations")
    .select("*")
    .eq("slug", ORG_SLUG)
    .maybeSingle();
  let org = existing as OrgRow | null;
  if (!org) {
    org = await createOrganization({ name: ORG_NAME, plan: "starter", ownerUserId: admin.id });
  }
  if (!org) return NextResponse.json({ error: "org_provision_failed" }, { status: 500 });

  // Single-key invariant: revoke all live keys on this org, mint one fresh.
  // Returned plaintext is shown once; QA captures it from this response.
  for (const k of await listApiKeys(org.id)) {
    if (!k.revoked_at) await revokeApiKey(org.id, k.id);
  }
  const minted = await createApiKey({
    orgId: org.id,
    name: "qa-seed",
    scopes: ["documents:generate", "notices:bulk"]
  });
  if (!minted) return NextResponse.json({ error: "key_mint_failed" }, { status: 500 });

  return NextResponse.json({
    ok: true,
    note: "passwords are deterministic per email; rotate by rotating QA_TEST_SECRET",
    admin: { email: ADMIN_EMAIL, password: adminPwd, user_id: admin.id },
    buyer: { email: BUYER_EMAIL, password: buyerPwd, user_id: buyer.id },
    org: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      monthly_doc_quota: org.monthly_doc_quota
    },
    api_key: {
      id: minted.row.id,
      prefix: minted.row.key_prefix,
      token: minted.token,
      scopes: minted.row.scopes
    }
  });
}

export async function DELETE(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const supa = getSupabaseServiceClient();
  if (!supa) return NextResponse.json({ error: "no_supabase" }, { status: 503 });

  const list = await supa.auth.admin.listUsers({ page: 1, perPage: 200 });
  const admin = list.data?.users?.find(
    (u) => (u.email ?? "").toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );
  const buyer = list.data?.users?.find(
    (u) => (u.email ?? "").toLowerCase() === BUYER_EMAIL.toLowerCase()
  );

  // Buyer-owned domain rows first (these reference public.users(id)).
  if (buyer) {
    await supa.from("payments").delete().eq("user_id", buyer.id);
    await supa.from("documents").delete().eq("user_id", buyer.id);
  }
  // Org cascades to api_keys + org_api_usage (FK on delete cascade).
  await supa.from("organizations").delete().eq("slug", ORG_SLUG);
  // Auth-user delete cascades the public.users row via the FK.
  let removedAdmin = false;
  let removedBuyer = false;
  if (admin) removedAdmin = !(await supa.auth.admin.deleteUser(admin.id)).error;
  if (buyer) removedBuyer = !(await supa.auth.admin.deleteUser(buyer.id)).error;

  return NextResponse.json({
    ok: true,
    removed: { admin: removedAdmin, buyer: removedBuyer, org_by_slug: ORG_SLUG }
  });
}
