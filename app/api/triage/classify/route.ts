import { NextResponse } from "next/server";
import { z } from "zod";
import { getAnthropic } from "@/lib/anthropic/client";
import { getCurrentUserId, insertClassifiedQuery } from "@/lib/triage/persistence";

export const runtime = "nodejs";

const Body = z.object({
  raw_text: z.string().trim().min(8).max(4000),
  transcript_url: z.string().url().optional()
});

export async function POST(req: Request) {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const userId = await getCurrentUserId();
  // Mock mode (no Supabase auth wired): allow the call to proceed without
  // persistence. Mirrors the waitlist route's degraded behaviour.
  if (!userId && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "Sign in to triage." }, { status: 401 });
  }

  const anthropic = getAnthropic();
  let result;
  try {
    result = await anthropic.classify(parsed.raw_text);
  } catch (err) {
    console.error("[triage/classify] anthropic failed", err);
    return NextResponse.json({ error: "Triage failed." }, { status: 502 });
  }

  let row = null;
  if (userId) {
    row = await insertClassifiedQuery({
      userId,
      rawText: parsed.raw_text,
      result,
      transcriptUrl: parsed.transcript_url ?? null
    });
  }

  return NextResponse.json({
    ok: true,
    persisted: !!row,
    query_id: row?.id ?? null,
    ...result
  });
}
