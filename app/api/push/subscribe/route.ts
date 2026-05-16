import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/triage/persistence";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const Body = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(10).max(500),
    auth: z.string().min(10).max(500)
  })
});

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Sign in." }, { status: 401 });

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const supa = getSupabaseServiceClient();
  if (!supa) return NextResponse.json({ ok: true, persisted: false });

  const userAgent = req.headers.get("user-agent")?.slice(0, 300) ?? null;
  const { error } = await supa.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: parsed.endpoint,
      p256dh: parsed.keys.p256dh,
      auth: parsed.keys.auth,
      user_agent: userAgent
    },
    { onConflict: "user_id,endpoint" }
  );
  if (error) {
    console.error("[push/subscribe] upsert failed", error);
    return NextResponse.json({ error: "Save failed." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, persisted: true });
}

export async function DELETE(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  const supa = getSupabaseServiceClient();
  if (!supa) return NextResponse.json({ ok: true });

  let endpoint: string | null = null;
  try {
    const body = await req.json();
    if (body && typeof body.endpoint === "string") endpoint = body.endpoint;
  } catch {
    /* allow empty body */
  }

  let q = supa.from("push_subscriptions").delete().eq("user_id", userId);
  if (endpoint) q = q.eq("endpoint", endpoint);
  await q;
  return NextResponse.json({ ok: true });
}
