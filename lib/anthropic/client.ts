import {
  CLASSIFICATIONS,
  URGENCIES,
  LANGUAGES,
  type Language,
  type Classification,
  type TriageClassification,
  type CasePrep
} from "./types";
import { CLASSIFY_SYSTEM, PREP_SYSTEM, TRIAGE_DISCLAIMER } from "./prompts";
import { generate, pickProvider } from "@/lib/llm/router";

// Back-compat: this module continues to expose AnthropicClient,
// getAnthropic, ANTHROPIC_ENABLED, and TRIAGE_DISCLAIMER. The actual
// backend is now selected by the multi-provider router in lib/llm/.
// Operators flip LLM_CLASSIFY and LLM_DRAFT on Vercel to swap backends
// without code changes; if those are unset, the router falls through
// in this order: anthropic -> openai -> openrouter -> sarvam -> ollama
// -> mock.

export const ANTHROPIC_ENABLED = !!process.env.ANTHROPIC_API_KEY;

export class AnthropicClient {
  async classify(rawText: string): Promise<TriageClassification> {
    const result = await generate({
      workload: "triage.classify",
      system: CLASSIFY_SYSTEM,
      user: rawText,
      max_tokens: 256
    });
    return parseClassification(JSON.parse(stripFences(result.text)));
  }

  async prep(args: {
    rawText: string;
    classification: Classification;
    language: Language;
  }): Promise<CasePrep> {
    const result = await generate({
      workload: "triage.prep",
      system: PREP_SYSTEM,
      user: [
        `Classification: ${args.classification}`,
        `Language: ${args.language}`,
        `Query: ${args.rawText}`
      ].join("\n"),
      max_tokens: 1500
    });
    return parseCasePrep(JSON.parse(stripFences(result.text)), args.language);
  }
}

export function getAnthropic(): AnthropicClient {
  return new AnthropicClient();
}

// Useful for diagnostics — surfaces which backend is actually serving
// each workload right now.
export function currentRouting() {
  return {
    classify: pickProvider("triage.classify").name,
    prep: pickProvider("triage.prep").name
  };
}

export { TRIAGE_DISCLAIMER };

// ---------------------------------------------------------------------------
// parsers + helpers
// ---------------------------------------------------------------------------
function stripFences(s: string): string {
  const trimmed = s.trim();
  if (trimmed.startsWith("```")) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
  }
  return trimmed;
}

function parseClassification(raw: unknown): TriageClassification {
  if (!raw || typeof raw !== "object") throw new Error("classify: not an object");
  const r = raw as Record<string, unknown>;
  const classification = pickEnum(r.classification, CLASSIFICATIONS, "other");
  const urgency = pickEnum(r.urgency, URGENCIES, "low");
  const language = pickEnum(r.language, LANGUAGES, "en");
  const confidence = clamp01(toNumber(r.confidence, 0.4));
  return { classification, urgency, confidence, language };
}

function parseCasePrep(raw: unknown, fallbackLanguage: Language): CasePrep {
  if (!raw || typeof raw !== "object") throw new Error("prep: not an object");
  const r = raw as Record<string, unknown>;
  const summary = String(r.summary ?? "").trim();
  if (!summary) throw new Error("prep: empty summary");

  const framework = Array.isArray(r.framework)
    ? r.framework
        .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
        .slice(0, 4)
        .map((x) => ({
          act: String(x.act ?? "").trim(),
          section: x.section ? String(x.section).trim() : undefined,
          note: x.note ? String(x.note).trim() : undefined
        }))
        .filter((x) => x.act.length > 0)
    : [];

  const next_steps = stringArray(r.next_steps).slice(0, 3);
  const documents_to_gather = stringArray(r.documents_to_gather).slice(0, 8);
  const urgency = pickEnum(r.urgency, URGENCIES, "low");
  const language = pickEnum(r.language, LANGUAGES, fallbackLanguage);

  return { summary, framework, next_steps, documents_to_gather, urgency, language };
}

function stringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? "").trim()).filter((x) => x.length > 0);
}

function pickEnum<T extends readonly string[]>(
  v: unknown,
  allowed: T,
  fallback: T[number]
): T[number] {
  return allowed.includes(v as T[number]) ? (v as T[number]) : fallback;
}

function toNumber(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
