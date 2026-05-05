import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 \-]{7,15}$/)
    .optional()
    .or(z.literal("")),
  locale: z.string().max(8).optional(),
  source: z.string().max(64).optional()
});

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    // Pre-deploy mode: accept the signup but don't persist.
    console.warn("[waitlist] Supabase not configured; skipping persistence", {
      email: parsed.email
    });
    return NextResponse.json({ ok: true, persisted: false });
  }

  const { error } = await supabase.from("waitlist").insert({
    email: parsed.email,
    phone: parsed.phone || null,
    locale: parsed.locale ?? "en",
    source: parsed.source ?? "landing"
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, persisted: true, duplicate: true });
    }
    console.error("[waitlist] insert failed", error);
    return NextResponse.json({ error: "Could not save signup." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, persisted: true });
}
