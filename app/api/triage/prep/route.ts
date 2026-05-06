import { NextResponse } from "next/server";
import { z } from "zod";
import { getAnthropic, TRIAGE_DISCLAIMER } from "@/lib/anthropic/client";
import { CLASSIFICATIONS, LANGUAGES } from "@/lib/anthropic/types";
import {
  getCurrentUserId,
  getQueryForUser,
  updateQueryWithPrep,
  markQueryFailed
} from "@/lib/triage/persistence";

export const runtime = "nodejs";

const Body = z
  .object({
    query_id: z.string().uuid().optional(),
    raw_text: z.string().trim().min(8).max(4000).optional(),
    classification: z.enum(CLASSIFICATIONS).optional(),
    language: z.enum(LANGUAGES).optional()
  })
  .refine((v) => !!v.query_id || !!v.raw_text, {
    message: "Provide query_id or raw_text"
  });

export async function POST(req: Request) {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const userId = await getCurrentUserId();
  if (!userId && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "Sign in to triage." }, { status: 401 });
  }

  let rawText = parsed.raw_text ?? "";
  let classification = parsed.classification ?? "other";
  let language = parsed.language ?? "en";

  if (parsed.query_id && userId) {
    const q = await getQueryForUser({ userId, queryId: parsed.query_id });
    if (!q) return NextResponse.json({ error: "Not found." }, { status: 404 });
    rawText = q.raw_text;
    classification = q.classification ?? "other";
    language = q.language ?? "en";
  }

  if (rawText.length < 8) {
    return NextResponse.json({ error: "Query too short." }, { status: 400 });
  }

  const anthropic = getAnthropic();
  let prep;
  try {
    prep = await anthropic.prep({ rawText, classification, language });
  } catch (err) {
    console.error("[triage/prep] anthropic failed", err);
    if (parsed.query_id) await markQueryFailed(parsed.query_id, "anthropic_prep_failed");
    return NextResponse.json({ error: "Prep failed." }, { status: 502 });
  }

  // PDF generation lands in a follow-up commit; for now we persist the
  // structured prep and surface it to the client without a stored URL.
  if (parsed.query_id) {
    await updateQueryWithPrep({
      queryId: parsed.query_id,
      prep,
      prepPdfUrl: null
    });
  }

  return NextResponse.json({
    ok: true,
    disclaimer: TRIAGE_DISCLAIMER,
    prep
  });
}
