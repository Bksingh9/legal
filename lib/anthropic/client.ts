import {
  CLASSIFICATIONS,
  URGENCIES,
  LANGUAGES,
  type Classification,
  type Urgency,
  type Language,
  type TriageClassification,
  type CasePrep
} from "./types";
import { CLASSIFY_SYSTEM, PREP_SYSTEM, TRIAGE_DISCLAIMER } from "./prompts";

const CLASSIFY_MODEL =
  process.env.ANTHROPIC_CLASSIFY_MODEL || "claude-haiku-4-5-20251001";
const TRIAGE_MODEL =
  process.env.ANTHROPIC_TRIAGE_MODEL || "claude-sonnet-4-6";

export const ANTHROPIC_ENABLED = !!process.env.ANTHROPIC_API_KEY;

export class AnthropicClient {
  private readonly apiKey: string | undefined;

  constructor(apiKey: string | undefined) {
    this.apiKey = apiKey;
  }

  // ---- classify ---------------------------------------------------------
  async classify(rawText: string): Promise<TriageClassification> {
    if (!this.apiKey) return mockClassify(rawText);

    const json = await this.callJson({
      model: CLASSIFY_MODEL,
      max_tokens: 256,
      system: [
        { type: "text", text: CLASSIFY_SYSTEM, cache_control: { type: "ephemeral" } }
      ],
      messages: [{ role: "user", content: rawText }]
    });

    return parseClassification(json);
  }

  // ---- prep -------------------------------------------------------------
  async prep(args: {
    rawText: string;
    classification: Classification;
    language: Language;
  }): Promise<CasePrep> {
    if (!this.apiKey) return mockPrep(args);

    const json = await this.callJson({
      model: TRIAGE_MODEL,
      max_tokens: 1500,
      system: [
        { type: "text", text: PREP_SYSTEM, cache_control: { type: "ephemeral" } }
      ],
      messages: [
        {
          role: "user",
          content: [
            `Classification: ${args.classification}`,
            `Language: ${args.language}`,
            `Query: ${args.rawText}`
          ].join("\n")
        }
      ]
    });

    return parseCasePrep(json, args.language);
  }

  // ---- low-level: messages.create returning the first text block as JSON
  private async callJson(body: unknown): Promise<unknown> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": this.apiKey as string
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`anthropic ${res.status}: ${text.slice(0, 500)}`);
    }
    const data = (await res.json()) as {
      content: Array<{ type: string; text?: string }>;
    };
    const textBlock = data.content.find((b) => b.type === "text");
    if (!textBlock?.text) throw new Error("anthropic: empty response");
    return JSON.parse(stripFences(textBlock.text));
  }
}

export function getAnthropic(): AnthropicClient {
  return new AnthropicClient(process.env.ANTHROPIC_API_KEY);
}

export { TRIAGE_DISCLAIMER };

// ---------------------------------------------------------------------------
// helpers
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

// ---------------------------------------------------------------------------
// deterministic mocks (used when ANTHROPIC_API_KEY is unset)
// ---------------------------------------------------------------------------
const HINDI_RX = /[ऀ-ॿ]/;

function mockClassify(rawText: string): TriageClassification {
  const t = rawText.toLowerCase();
  let classification: Classification = "other";
  let urgency: Urgency = "low";

  if (/cheque|bounce|s\.?\s*138|dishonour/.test(t)) classification = "criminal";
  else if (/rent|landlord|tenant|eviction|lease|society/.test(t)) classification = "property";
  else if (/divorce|custody|maintenance|dowry|marriage|husband|wife/.test(t)) classification = "family";
  else if (/refund|consumer|defective|amazon|flipkart|warranty|swiggy|zomato/.test(t)) classification = "consumer";
  else if (/fir|arrest|police|chargesheet|bail|ipc|bns/.test(t)) {
    classification = "criminal";
    urgency = "high";
  } else if (/notice|legal notice|contract|breach|loan/.test(t)) classification = "civil";
  else if (/employer|salary|terminated|layoff|hr|epf/.test(t)) classification = "labour";
  else if (/gst|income tax|tds|notice from/.test(t)) classification = "tax";
  else if (/hack|phishing|otp|fraud|upi/.test(t)) classification = "cyber";

  if (/today|tomorrow|deadline|hearing|urgent|immediately/.test(t)) {
    urgency = urgency === "low" ? "medium" : "high";
  }
  if (/arrest|in custody|domestic violence|dv/.test(t)) urgency = "critical";

  const language: Language = HINDI_RX.test(rawText) ? "hi" : "en";
  return { classification, urgency, confidence: 0.55, language };
}

function mockPrep(args: {
  rawText: string;
  classification: Classification;
  language: Language;
}): CasePrep {
  const isHi = args.language === "hi";
  const summary = isHi
    ? "आपकी समस्या प्रथमदृष्टया एक " +
      args.classification +
      " मामले के रूप में दिखती है। आगे के कदम नीचे दिए गए हैं। यह कानूनी सलाह नहीं है।"
    : `Your situation appears to fall under ${args.classification}. The next steps below are general; consult an advocate before filing anything.`;

  const next_steps = isHi
    ? [
        "सभी प्रासंगिक दस्तावेज़ इकट्ठा कीजिए।",
        "घटना का संक्षिप्त लिखित विवरण तैयार कीजिए।",
        "किसी योग्य वकील से 15-मिनट का परामर्श कीजिए।"
      ]
    : [
        "Gather all related documents and communications.",
        "Write a one-page chronological summary of the events.",
        "Book a 15-minute consultation with a qualified advocate."
      ];

  const documents_to_gather = isHi
    ? ["पहचान प्रमाण", "घटना का प्रमाण", "पिछले पत्राचार/संदेश"]
    : ["Government photo ID", "Documentary proof of the dispute", "Prior correspondence (emails, WhatsApp)"];

  return {
    summary,
    framework: [
      args.classification === "consumer"
        ? { act: "Consumer Protection Act 2019", section: "12", note: undefined }
        : args.classification === "family"
          ? { act: "Hindu Marriage Act 1955", section: undefined, note: undefined }
          : args.classification === "criminal"
            ? { act: "BNS / IPC", section: undefined, note: undefined }
            : { act: "General civil procedure (CPC)", section: undefined, note: undefined }
    ],
    next_steps,
    documents_to_gather,
    urgency: "medium",
    language: args.language
  };
}
