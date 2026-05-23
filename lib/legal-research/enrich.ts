import { getLegalResearch, isLegalResearchConfigured } from "./client";
import type { GroundedFrameworkEntry } from "./types";
import type { CasePrep } from "@/lib/anthropic/types";

// Compliance note (SPEC.md §1): the public Case Prep cites Acts and section
// numbers ONLY — never case names or judgments. So grounding verifies each
// framework Act against primary legislation (IndiaCode), and deliberately
// does NOT touch the case_law namespace. Case-law search stays available via
// the client for internal / advocate-only surfaces, not this one.

export type { GroundedFrameworkEntry };

// Score alone is NOT a safe verification signal. Verified against the live
// connector (2026-05): a semantic search for "Negotiable Instruments Act"
// returned "Dekkhan Agriculturists' Relief Act, 1879" at 0.51, and
// "Information Technology Act" returned "Credit Information Companies Act,
// 2005" at 0.53 — both above any reasonable score cutoff. Many core Indian
// Acts (NI Act 1881, IT Act 2000) are simply absent from the IndiaCode
// corpus, so the engine returns a confident wrong neighbour. We therefore
// require BOTH a score floor AND a title-token match: the matched document's
// title must contain the distinctive words of the cited Act. A false
// citation in a Case Prep is worse than no citation, so this fails safe.
const MATCH_THRESHOLD = 0.4;

const TITLE_STOPWORDS = new Set([
  "the",
  "act",
  "code",
  "of",
  "and",
  "for",
  "section",
  "rules",
  "amendment",
  "regulation",
  "regulations"
]);

// Distinctive lowercase tokens: words minus stopwords and 4-digit years.
function titleTokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !TITLE_STOPWORDS.has(w) && !/^\d{4}$/.test(w));
}

// True when the matched title covers the distinctive tokens of the cited Act.
// "Consumer Protection Act 2019" -> {consumer, protection} ⊆ "The Consumer
// Protection Act, 2019" ✓. "Negotiable Instruments Act 1881" -> {negotiable,
// instruments} ⊄ "Dekkhan Agriculturists' Relief Act, 1879" ✗.
function titleMatches(citedAct: string, matchedTitle: string): boolean {
  const cited = titleTokens(citedAct);
  if (cited.length === 0) return false;
  const inTitle = new Set(titleTokens(matchedTitle));
  const overlap = cited.filter((t) => inTitle.has(t)).length;
  return overlap / cited.length >= 0.6;
}

// Verifies each Act in a Case Prep framework against Indian legislation.
// Best-effort: returns the original entries (verified:false) if the connector
// is unconfigured, the Act is absent, or any lookup fails. Never throws.
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
          top_k: 3
        });
        const top = res.hits.find(
          (h) => h.score >= MATCH_THRESHOLD && titleMatches(entry.act, h.title)
        );
        if (!top) return entry;
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
