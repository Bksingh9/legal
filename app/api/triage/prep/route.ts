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
import { renderCasePrepPdf } from "@/lib/pdf/case-prep";
import { uploadCasePrepPdf } from "@/lib/storage/case-prep";
import { rateLimitOrReject } from "@/lib/rate-limit/check";
import { groundCasePrepFramework } from "@/lib/legal-research/enrich";

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
  const limited = await rateLimitOrReject(req, { bucket: "triage-prep", max: 30 });
  if (limited) return limited;

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const userId = await getCurrentUserId();
  // Public: anonymous visitors get the prep; persistence + PDF upload
  // only when authenticated.

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

  // Best-effort: verify the cited Acts against primary legislation. No-ops
  // gracefully (returns unverified entries) when the connector is unset.
  const groundedFramework = await groundCasePrepFramework(prep.framework);

  let pdfUrl: string | null = null;
  if (parsed.query_id && userId) {
    try {
      const pdf = await renderCasePrepPdf({
        classification,
        prep,
        groundedFramework,
        generatedAt: new Date(),
        queryId: parsed.query_id
      });
      pdfUrl = await uploadCasePrepPdf({
        userId,
        queryId: parsed.query_id,
        pdf
      });
    } catch (err) {
      console.error("[triage/prep] pdf pipeline failed", err);
    }

    await updateQueryWithPrep({
      queryId: parsed.query_id,
      prep,
      prepPdfUrl: pdfUrl
    });
  }

  return NextResponse.json({
    ok: true,
    disclaimer: TRIAGE_DISCLAIMER,
    prep,
    grounded_framework: groundedFramework,
    prep_pdf_url: pdfUrl
  });
}
