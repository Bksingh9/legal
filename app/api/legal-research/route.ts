import { NextResponse } from "next/server";
import { z } from "zod";
import { getLegalResearch, isLegalResearchConfigured } from "@/lib/legal-research/client";
import { NAMESPACES } from "@/lib/legal-research/types";
import { rateLimitOrReject } from "@/lib/rate-limit/check";

export const runtime = "nodejs";

const Body = z.object({
  query: z.string().trim().min(3).max(500),
  namespace: z.enum(NAMESPACES).default("legislation"),
  country: z.array(z.string().length(2).or(z.string().max(5))).max(5).optional(),
  top_k: z.number().int().min(1).max(20).optional(),
  source_id: z.string().max(64).optional(),
  court_tier: z.number().int().min(1).max(3).optional(),
  language: z.string().max(8).optional()
});

export async function POST(req: Request) {
  const limited = await rateLimitOrReject(req, { bucket: "legal-research", max: 30 });
  if (limited) return limited;

  if (!isLegalResearchConfigured()) {
    return NextResponse.json({ error: "Legal research is not enabled." }, { status: 503 });
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  try {
    const result = await getLegalResearch().search({
      query: parsed.query,
      namespace: parsed.namespace,
      country: parsed.country ?? ["IN"],
      top_k: parsed.top_k,
      source_id: parsed.source_id,
      court_tier: parsed.court_tier,
      language: parsed.language
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[legal-research] search failed", err);
    return NextResponse.json({ error: "Search failed." }, { status: 502 });
  }
}
