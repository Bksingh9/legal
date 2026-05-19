import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";

// Admin gate. Source of truth: the `user_role_grants` table from
// migration 0014. Falls back to `users.role` for the boot scenario
// where the grants table hasn't been backfilled yet. Falls open in
// mock mode (no Supabase configured) so developers can exercise the
// admin queue UI locally.

export async function requireAdmin(): Promise<
  | { ok: true; userId: string; mock: boolean }
  | { ok: false; reason: "unauthenticated" | "forbidden" | "unconfigured" }
> {
  const ssr = getSupabaseServerClient();
  if (!ssr) {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return { ok: false, reason: "unconfigured" };
    }
    return { ok: true, userId: "mock-admin", mock: true };
  }

  const {
    data: { user }
  } = await ssr.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const service = getSupabaseServiceClient();
  if (!service) return { ok: false, reason: "unconfigured" };

  // Primary: user_role_grants table. Honours revoked_at.
  const { data: grants } = await service
    .from("user_role_grants")
    .select("role, revoked_at")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .is("revoked_at", null)
    .limit(1);
  if (grants && grants.length > 0) {
    return { ok: true, userId: user.id, mock: false };
  }

  // Fallback to users.role for the boot scenario (covered by the
  // 0007 trigger; the 0014 migration also mirrors into grants).
  const { data: userRow, error } = await service
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    console.error("[admin/role] lookup", error);
    return { ok: false, reason: "forbidden" };
  }
  if ((userRow as { role?: string } | null)?.role !== "admin") {
    return { ok: false, reason: "forbidden" };
  }
  return { ok: true, userId: user.id, mock: false };
}
