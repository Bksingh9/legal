import type { LLMProvider, ChatRequest, Workload } from "../types";

// Workload-aware deterministic mock. Returns JSON-shaped text that the
// existing parsers in lib/anthropic/client.ts (classify, prep) and
// lib/consult/summarize.ts can consume. Used as the universal fallback
// when no provider is configured for a workload — so the whole product
// runs end-to-end on a fresh checkout with zero API spend.

const HINDI_RX = /[ऀ-ॿ]/;

export const mockProvider: LLMProvider = {
  name: "mock",
  available: () => true,
  async generate(req: ChatRequest) {
    const text = renderMockText(req.workload, req.user);
    return { text, provider: "mock", model: "deterministic" };
  }
};

function renderMockText(workload: Workload, user: string): string {
  switch (workload) {
    case "triage.classify":
      return JSON.stringify(mockClassify(user));
    case "triage.prep":
      return JSON.stringify(mockPrep(user));
    case "consult.summarize":
      return JSON.stringify(mockSummary(user));
    case "blog.generate":
      return JSON.stringify(mockBlog(user));
  }
}

function mockClassify(rawText: string) {
  const t = rawText.toLowerCase();
  let classification = "other";
  let urgency = "low";

  if (/cheque|bounce|s\.?\s*138|dishonour/.test(t)) classification = "criminal";
  else if (/rent|landlord|tenant|eviction|lease|society/.test(t))
    classification = "property";
  else if (/divorce|custody|maintenance|dowry|marriage|husband|wife/.test(t))
    classification = "family";
  else if (/refund|consumer|defective|amazon|flipkart|warranty|swiggy|zomato/.test(t))
    classification = "consumer";
  else if (/fir|arrest|police|chargesheet|bail|ipc|bns/.test(t)) {
    classification = "criminal";
    urgency = "high";
  } else if (/notice|legal notice|contract|breach|loan/.test(t))
    classification = "civil";
  else if (/employer|salary|terminated|layoff|hr|epf/.test(t))
    classification = "labour";
  else if (/gst|income tax|tds|notice from/.test(t)) classification = "tax";
  else if (/hack|phishing|otp|fraud|upi/.test(t)) classification = "cyber";

  if (/today|tomorrow|deadline|hearing|urgent|immediately/.test(t)) {
    urgency = urgency === "low" ? "medium" : "high";
  }
  if (/arrest|in custody|domestic violence|dv/.test(t)) urgency = "critical";

  const language = HINDI_RX.test(rawText) ? "hi" : "en";
  return { classification, urgency, confidence: 0.55, language };
}

function mockPrep(user: string) {
  // The prep user content has the shape:
  //   Classification: <c>
  //   Language: <l>
  //   Query: <rawText>
  const cMatch = /^Classification:\s*(\S+)/m.exec(user);
  const lMatch = /^Language:\s*(\S+)/m.exec(user);
  const classification = cMatch?.[1] ?? "other";
  const language = (lMatch?.[1] === "hi" ? "hi" : "en") as "en" | "hi";
  const isHi = language === "hi";

  const summary = isHi
    ? "आपकी समस्या प्रथमदृष्टया एक " +
      classification +
      " मामले के रूप में दिखती है। आगे के कदम नीचे दिए गए हैं। यह कानूनी सलाह नहीं है।"
    : `Your situation appears to fall under ${classification}. The next steps below are general; consult an advocate before filing anything.`;

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
    : [
        "Government photo ID",
        "Documentary proof of the dispute",
        "Prior correspondence (emails, WhatsApp)"
      ];

  const framework =
    classification === "consumer"
      ? [{ act: "Consumer Protection Act 2019", section: "12" }]
      : classification === "family"
        ? [{ act: "Hindu Marriage Act 1955" }]
        : classification === "criminal"
          ? [{ act: "BNS / IPC" }]
          : [{ act: "General civil procedure (CPC)" }];

  return {
    summary,
    framework,
    next_steps,
    documents_to_gather,
    urgency: "medium",
    language
  };
}

function mockSummary(user: string) {
  const transcript = user
    .replace(/^Transcript language:.*$/m, "")
    .replace(/\s+/g, " ")
    .trim();
  return {
    facts: transcript.slice(0, 240) || "(transcript not provided)",
    advocate_view:
      "The advocate walked through the applicable framework and explained the next reasonable steps.",
    next_steps: [
      "Gather and label all related documents.",
      "Send the relevant counter-party a written communication if not already.",
      "Schedule a follow-up if a deadline is approaching."
    ],
    documents_to_keep: [],
    language: HINDI_RX.test(user) ? "hi" : "en"
  };
}

function mockBlog(user: string) {
  const keyword = user.replace(/^Intent keyword:\s*/i, "").trim();
  const slug =
    keyword
      .toLowerCase()
      .replace(/[^a-z0-9\s-]+/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 50) || "stub-article";
  return {
    slug,
    title: keyword || "Stub article",
    description:
      "Stub article generated by the mock LLM provider. Configure ANTHROPIC_API_KEY or OPENAI_API_KEY for real content.",
    intent_keywords: [keyword].filter(Boolean),
    faqs: [
      {
        question: "What is this?",
        answer:
          "A placeholder from the mock provider so the blog pipeline can be exercised without LLM credits."
      }
    ],
    body_md:
      "## Stub\n\nThis is mock-provider output. Real Sonnet-drafted articles appear once you configure a provider in `LLM_BLOG` and provide the matching API key."
  };
}
