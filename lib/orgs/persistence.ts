import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { ORG_PLANS, planQuota, currentPeriod, type OrgPlan } from "./plans";
import {
  generateApiKey,
  sha256Hex,
  extractToken,
  type ApiScope,
  type GeneratedKey
} from "./api-key";

export interface OrgRow {
  id: string;
  name: string;
  slug: string;
  plan: OrgPlan;
  status: "active" | "suspended";
  owner_user_id: string | null;
  monthly_doc_quota: number;
  created_at: string;
}

export interface ApiKeyRow {
  id: string;
  org_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "org";
}

export async function listOrganizations(): Promise<OrgRow[]> {
  const supa = getSupabaseServiceClient();
  if (!supa) return [];
  const { data, error } = await supa
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[orgs] list", error);
    return [];
  }
  return (data as OrgRow[]) ?? [];
}

export async function createOrganization(args: {
  name: string;
  plan: OrgPlan;
  ownerUserId?: string | null;
}): Promise<OrgRow | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;
  const base = slugify(args.name);
  // Slug is unique; suffix on collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const { data, error } = await supa
      .from("organizations")
      .insert({
        name: args.name,
        slug,
        plan: args.plan,
        monthly_doc_quota: planQuota(args.plan),
        owner_user_id: args.ownerUserId ?? null
      })
      .select("*")
      .single();
    if (!error) return data as OrgRow;
    if ((error as { code?: string }).code !== "23505") {
      console.error("[orgs] create", error);
      return null;
    }
  }
  return null;
}

export async function getOrganization(id: string): Promise<OrgRow | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;
  const { data, error } = await supa
    .from("organizations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[orgs] get", error);
    return null;
  }
  return (data as OrgRow) ?? null;
}

// Updates plan (and the derived quota) and/or status.
export async function updateOrganization(
  id: string,
  patch: { plan?: OrgPlan; status?: "active" | "suspended" }
): Promise<OrgRow | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;
  const update: Record<string, unknown> = {};
  if (patch.plan) {
    update.plan = patch.plan;
    update.monthly_doc_quota = ORG_PLANS[patch.plan].monthly_doc_quota;
  }
  if (patch.status) update.status = patch.status;
  if (Object.keys(update).length === 0) return getOrganization(id);

  const { data, error } = await supa
    .from("organizations")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    console.error("[orgs] update", error);
    return null;
  }
  return data as OrgRow;
}

export async function listApiKeys(orgId: string): Promise<ApiKeyRow[]> {
  const supa = getSupabaseServiceClient();
  if (!supa) return [];
  const { data, error } = await supa
    .from("api_keys")
    .select("id, org_id, name, key_prefix, scopes, last_used_at, created_at, revoked_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[orgs] listKeys", error);
    return [];
  }
  return (data as ApiKeyRow[]) ?? [];
}

// Mints a key, persists only its hash + prefix, and returns the plaintext
// token once (the caller must surface it immediately — it cannot be recovered).
export async function createApiKey(args: {
  orgId: string;
  name: string;
  scopes: ApiScope[];
}): Promise<{ row: ApiKeyRow; token: string } | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;
  const minted: GeneratedKey = generateApiKey();
  const { data, error } = await supa
    .from("api_keys")
    .insert({
      org_id: args.orgId,
      name: args.name,
      key_prefix: minted.prefix,
      key_hash: minted.hash,
      scopes: args.scopes
    })
    .select("id, org_id, name, key_prefix, scopes, last_used_at, created_at, revoked_at")
    .single();
  if (error) {
    console.error("[orgs] createKey", error);
    return null;
  }
  return { row: data as ApiKeyRow, token: minted.token };
}

export async function revokeApiKey(orgId: string, keyId: string): Promise<boolean> {
  const supa = getSupabaseServiceClient();
  if (!supa) return false;
  const { error } = await supa
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("org_id", orgId)
    .is("revoked_at", null);
  if (error) {
    console.error("[orgs] revokeKey", error);
    return false;
  }
  return true;
}

export interface AuthedOrg {
  org: OrgRow;
  keyId: string;
  scopes: string[];
}

export type ApiAuthError =
  | "missing_key"
  | "invalid_key"
  | "revoked"
  | "org_suspended"
  | "unconfigured";

// Authenticates an inbound /api/v1 request by its bearer/x-api-key token.
// Looks up the row by sha256 hash, rejects revoked keys and suspended orgs,
// and best-effort stamps last_used_at.
export async function authenticateApiKey(
  req: Request
): Promise<{ ok: true; authed: AuthedOrg } | { ok: false; error: ApiAuthError }> {
  const token = extractToken(req);
  if (!token) return { ok: false, error: "missing_key" };

  const supa = getSupabaseServiceClient();
  if (!supa) return { ok: false, error: "unconfigured" };

  const hash = sha256Hex(token);
  const { data, error } = await supa
    .from("api_keys")
    .select("id, org_id, scopes, revoked_at")
    .eq("key_hash", hash)
    .maybeSingle();
  if (error) {
    console.error("[orgs] auth lookup", error);
    return { ok: false, error: "invalid_key" };
  }
  if (!data) return { ok: false, error: "invalid_key" };
  const key = data as { id: string; org_id: string; scopes: string[]; revoked_at: string | null };
  if (key.revoked_at) return { ok: false, error: "revoked" };

  const org = await getOrganization(key.org_id);
  if (!org) return { ok: false, error: "invalid_key" };
  if (org.status === "suspended") return { ok: false, error: "org_suspended" };

  // Best-effort last-used stamp; never blocks the request.
  void supa.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id);

  return { ok: true, authed: { org, keyId: key.id, scopes: key.scopes } };
}

export function hasScope(authed: AuthedOrg, scope: ApiScope): boolean {
  return authed.scopes.includes(scope);
}

export interface QuotaResult {
  allowed: boolean;
  doc_count: number;
  monthly_quota: number;
}

// Atomically consumes `n` documents from the org's monthly quota.
export async function consumeQuota(org: OrgRow, n: number): Promise<QuotaResult> {
  const supa = getSupabaseServiceClient();
  if (!supa) return { allowed: true, doc_count: 0, monthly_quota: org.monthly_doc_quota };
  const { data, error } = await supa.rpc("org_usage_consume", {
    in_org: org.id,
    in_period: currentPeriod(),
    in_quota: org.monthly_doc_quota,
    in_n: n
  });
  if (error || !data || (data as unknown[]).length === 0) {
    console.error("[orgs] consumeQuota", error);
    // Fail closed on quota: a metering bug must not allow unlimited billing.
    return { allowed: false, doc_count: 0, monthly_quota: org.monthly_doc_quota };
  }
  const row = (data as { allowed: boolean; doc_count: number; monthly_quota: number }[])[0];
  return { allowed: row.allowed, doc_count: row.doc_count, monthly_quota: row.monthly_quota };
}
