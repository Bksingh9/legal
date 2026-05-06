import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";

// Admin gate. Requires:
// - a Supabase session (auth.getUser via SSR cookies)
// - users.role = 'admin' on the matching row
//
// Falls open in mock mode (no Supabase configured) so developers can
// exercise the admin queue UI locally; production deployments must set
// NEXT_PUBLIC_SUPABASE_URL.

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

  const { data, error } = await service
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    console.error("[admin/role] lookup", error);
    return { ok: false, reason: "forbidden" };
  }
  if ((data as { role?: string } | null)?.role !== "admin") {
    return { ok: false, reason: "forbidden" };
  }
  return { ok: true, userId: user.id, mock: false };
}
