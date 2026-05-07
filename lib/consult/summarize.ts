import { TRIAGE_DISCLAIMER } from "@/lib/anthropic/prompts";

const TRIAGE_MODEL =
  process.env.ANTHROPIC_TRIAGE_MODEL || "claude-sonnet-4-6";

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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return mockSummary(args.transcript);
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": apiKey
    },
    body: JSON.stringify({
      model: TRIAGE_MODEL,
      max_tokens: 1500,
      system: [
        {
          type: "text",
          text: SUMMARY_SYSTEM,
          cache_control: { type: "ephemeral" }
        }
      ],
      messages: [
        {
          role: "user",
          content: `Transcript language: ${args.language}\n\n${args.transcript}`
        }
      ]
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`anthropic summarize ${res.status}: ${text.slice(0, 400)}`);
  }
  const data = (await res.json()) as {
    content: Array<{ type: string; text?: string }>;
  };
  const block = data.content.find((b) => b.type === "text");
  if (!block?.text) throw new Error("anthropic: empty summary");

  const parsed = safeJson(block.text);
  if (!parsed) {
    return `${block.text.trim()}\n\n${TRIAGE_DISCLAIMER}`;
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

function mockSummary(transcript: string): string {
  const facts = transcript.slice(0, 240).replace(/\s+/g, " ").trim();
  const parts = [
    "Facts:",
    facts || "(transcript not provided)",
    "",
    "Advocate's view:",
    "The advocate walked through the applicable framework and explained the next reasonable steps.",
    "",
    "Next steps:",
    "1. Gather and label all related documents.",
    "2. Send the relevant counter-party a written communication if you have not already.",
    "3. Schedule a follow-up if a deadline is approaching.",
    "",
    TRIAGE_DISCLAIMER
  ];
  return parts.join("\n");
}
