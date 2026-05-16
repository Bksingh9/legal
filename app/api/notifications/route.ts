import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/triage/persistence";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/notifications?unread=1 -> list mine
export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  const supa = getSupabaseServiceClient();
  if (!supa) return NextResponse.json({ ok: true, items: [] });

  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unread") === "1";
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));

  let q = supa
    .from("notifications")
    .select("id, kind, title, body, link, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (unreadOnly) q = q.is("read_at", null);

  const { data, error } = await q;
  if (error) {
    console.error("[notifications] list failed", error);
    return NextResponse.json({ error: "List failed." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, items: data ?? [] });
}

const PatchBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100).optional(),
  all: z.boolean().optional()
});

// PATCH /api/notifications -> { ids: [...] } | { all: true }   marks read
export async function PATCH(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  const supa = getSupabaseServiceClient();
  if (!supa) return NextResponse.json({ ok: true, updated: 0 });

  let parsed: z.infer<typeof PatchBody>;
  try {
    parsed = PatchBody.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  if (!parsed.ids && !parsed.all) {
    return NextResponse.json({ error: "Provide ids or all=true." }, { status: 400 });
  }

  const now = new Date().toISOString();
  let q = supa.from("notifications").update({ read_at: now }).eq("user_id", userId);
  if (parsed.ids) q = q.in("id", parsed.ids);
  else q = q.is("read_at", null);

  const { data, error } = await q.select("id");
  if (error) {
    console.error("[notifications] patch failed", error);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, updated: data?.length ?? 0 });
}
