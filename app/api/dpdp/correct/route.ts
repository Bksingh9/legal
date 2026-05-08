import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/triage/persistence";
import { correctProfile } from "@/lib/dpdp/persistence";

export const runtime = "nodejs";

const Body = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  locale: z.string().trim().min(2).max(8).optional()
});

export async function POST(req: Request) {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  if (!parsed.name && !parsed.locale) {
    return NextResponse.json({ error: "Nothing to correct." }, { status: 400 });
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: "Sign in." }, { status: 401 });
    }
    return NextResponse.json({ ok: true, mock: true });
  }

  const ok = await correctProfile({ userId, patch: parsed });
  if (!ok) return NextResponse.json({ error: "Could not update." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
