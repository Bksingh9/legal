import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/triage/persistence";
import { getConsultationById, markDisputed } from "@/lib/consult/persistence";

export const runtime = "nodejs";

const Body = z.object({ reason: z.string().trim().min(8).max(2000) });

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: "Sign in." }, { status: 401 });
    }
    return NextResponse.json({ ok: true, mock: true });
  }
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Provide a dispute reason." }, { status: 400 });
  }

  const c = await getConsultationById(params.id);
  if (!c) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (c.user_id !== userId) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  if (c.payout_released_at) {
    return NextResponse.json(
      { error: "Payout already released; raise via support." },
      { status: 409 }
    );
  }

  await markDisputed({ consultationId: c.id, reason: parsed.reason });
  return NextResponse.json({ ok: true });
}
