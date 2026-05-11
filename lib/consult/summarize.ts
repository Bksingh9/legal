import { TRIAGE_DISCLAIMER } from "@/lib/anthropic/prompts";
import { generate } from "@/lib/llm/router";

const SUMMARY_SYSTEM = `You are a paralegal taking notes after a 15-60 minute
consultation between an Indian advocate and a client. Read the transcript and
produce a tight client-facing summary in plain language.

Output strict JSON:
{
  "facts": string,                   // 2-4 sentence factual recap
  "advocate_view": string,           // 2-4 sentences of what the advocate said
  "next_steps": string[],            // 2-5 imperative actions for the client
  "documents_to_keep": string[],     // optional, evidence to preserve
  "language": "en"|"hi"
}

Rules:
- Use the same language as the transcript. If mixed, use English with Indic
  terms preserved.
- Never name lawyers, judges, or specific case names.
- Keep each section under 80 words.`;

export async function summarizeTranscript(args: {
  transcript: string;
  language: string;
}): Promise<string> {
  const result = await generate({
    workload: "consult.summarize",
    system: SUMMARY_SYSTEM,
    user: `Transcript language: ${args.language}\n\n${args.transcript}`,
    max_tokens: 1500
  });

  const parsed = safeJson(result.text);
  if (!parsed) {
    return `${result.text.trim()}\n\n${TRIAGE_DISCLAIMER}`;
  }
  return formatSummaryFromJson(parsed);
}

function safeJson(s: string): Record<string, unknown> | null {
  const trimmed = s.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function formatSummaryFromJson(o: Record<string, unknown>): string {
  const facts = String(o.facts ?? "").trim();
  const advocateView = String(o.advocate_view ?? "").trim();
  const nextSteps = Array.isArray(o.next_steps)
    ? (o.next_steps as unknown[]).map(String).filter((x) => x.trim().length > 0)
    : [];
  const docs = Array.isArray(o.documents_to_keep)
    ? (o.documents_to_keep as unknown[]).map(String).filter((x) => x.trim().length > 0)
    : [];

  const parts = [
    facts ? `Facts:\n${facts}` : null,
    advocateView ? `Advocate's view:\n${advocateView}` : null,
    nextSteps.length > 0
      ? `Next steps:\n${nextSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
      : null,
    docs.length > 0
      ? `Documents to keep:\n${docs.map((s) => `- ${s}`).join("\n")}`
      : null,
    TRIAGE_DISCLAIMER
  ];
  return parts.filter(Boolean).join("\n\n");
}
