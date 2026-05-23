import { getLegalResearch, isLegalResearchConfigured } from "./client";
import type { CasePrep } from "@/lib/anthropic/types";

// Compliance note (SPEC.md §1): the public Case Prep cites Acts and section
// numbers ONLY — never case names or judgments. So grounding verifies each
// framework Act against primary legislation (IndiaCode), and deliberately
// does NOT touch the case_law namespace. Case-law search stays available via
// the client for internal / advocate-only surfaces, not this one.

export interface GroundedFrameworkEntry {
  act: string;
  section?: string;
  note?: string;
  // Enrichment — present only when a confident legislation match is found.
  verified: boolean;
  official_title?: string;
  source_url?: string;
  india_code_id?: string;
}

const MATCH_THRESHOLD = 0.45;

// Verifies each Act in a Case Prep framework against Indian legislation.
// Best-effort: returns the original entries (verified:false) if the connector
// is unconfigured or any lookup fails. Never throws.
export async function groundCasePrepFramework(
  framework: CasePrep["framework"]
): Promise<GroundedFrameworkEntry[]> {
  const base: GroundedFrameworkEntry[] = framework.map((f) => ({ ...f, verified: false }));
  if (!isLegalResearchConfigured() || framework.length === 0) return base;

  const research = getLegalResearch();
  return Promise.all(
    base.map(async (entry) => {
      try {
        const res = await research.search({
          query: entry.act,
          namespace: "legislation",
          country: ["IN"],
          source_id: "IN/IndiaCode",
          top_k: 1
        });
        const top = res.hits[0];
        if (!top || top.score < MATCH_THRESHOLD) return entry;
        return {
          ...entry,
          verified: true,
          official_title: top.title,
          source_url: top.url ?? undefined,
          india_code_id: top.source_id
        };
      } catch {
        return entry;
      }
    })
  );
}
