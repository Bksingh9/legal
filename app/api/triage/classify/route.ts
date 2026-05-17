import { NextResponse } from "next/server";
import { z } from "zod";
import { getAnthropic } from "@/lib/anthropic/client";
import { getCurrentUserId, insertClassifiedQuery } from "@/lib/triage/persistence";
import { rateLimitOrReject } from "@/lib/rate-limit/check";

export const runtime = "nodejs";

const Body = z.object({
  raw_text: z.string().trim().min(8).max(4000),
  transcript_url: z.string().url().optional()
});

export async function POST(req: Request) {
  const limited = await rateLimitOrReject(req, { bucket: "triage-classify", max: 60 });
  if (limited) return limited;

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const userId = await getCurrentUserId();
  // Public endpoint: anonymous visitors can run triage. Persistence
  // only fires when a real user is signed in — otherwise the call
  // returns the classification without writing a `queries` row.

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
