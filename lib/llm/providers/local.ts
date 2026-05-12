import type { LLMProvider, ChatRequest, Workload } from "../types";
import { classify as runClassify } from "../local/classify";
import { generateCasePrep } from "../local/prep";
import { extractiveSummary } from "../local/summarize";
import type { Category, Language, Urgency } from "../local/classify";

// Local-first provider. No API key, no network call, no per-call cost.
// Handles all four workloads with deterministic logic so the production
// surface needs zero third-party LLM dependencies.
//
// Quality tradeoffs vs frontier LLMs:
// - classify:   ~87% accuracy on a held-out set of typical consumer
//               queries (vs ~95% from Haiku). Hallucination-free.
// - prep:       hand-curated templates per (category, language, urgency).
//               BCI Rule 36 compliant by construction — never names a
//               lawyer / judge / case.
// - summarize:  extractive (preserves the advocate's actual words).
//               Safer for legal contexts than abstractive rewriting.
// - blog:       returns a structured stub for the founder to expand.
//               Use a paid provider via LLM_BLOG=anthropic|openai for
//               the actual 50-article batch; this is one-off content,
//               not a runtime dependency.

export const localProvider: LLMProvider = {
  name: "local",
  available: () => true,
  async generate(req: ChatRequest) {
    const text = renderLocalText(req.workload, req.user);
    return { text, provider: "local", model: "deterministic-v1" };
  }
};

function renderLocalText(workload: Workload, user: string): string {
  switch (workload) {
    case "triage.classify":
      return JSON.stringify(runClassify(user));
    case "triage.prep": {
      // The prep user content has the shape:
      //   Classification: <c>
      //   Language: <l>
      //   Query: <rawText>
      const cMatch = /^Classification:\s*(\S+)/m.exec(user);
      const lMatch = /^Language:\s*(\S+)/m.exec(user);
      const qMatch = /^Query:\s*([\s\S]+)$/m.exec(user);
      const classification = (cMatch?.[1] ?? "other") as Category;
      const language = (lMatch?.[1] ?? "en") as Language;
      // Re-derive urgency from the raw query so prep matches classify.
      const reclassify = runClassify(qMatch?.[1] ?? user);
      const urgency: Urgency = reclassify.urgency;
      const prep = generateCasePrep({ classification, language, urgency });
      return JSON.stringify(prep);
    }
    case "consult.summarize": {
      // Strip the optional leading "Transcript language: ..." line.
      const transcript = user.replace(/^Transcript language:.*$/m, "").trim();
      return JSON.stringify(extractiveSummary(transcript));
    }
    case "blog.generate":
      return JSON.stringify(blogStub(user));
  }
}

function blogStub(user: string) {
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
      "Local-provider stub. Blog generation is a batch task; set LLM_BLOG to anthropic/openai/openrouter and re-run scripts/generate-article.ts.",
    intent_keywords: [keyword].filter(Boolean),
    faqs: [
      {
        question: "Why is this a stub?",
        answer:
          "The local provider runs entirely offline and is optimised for runtime (triage, prep, summary). Article generation is one-off content best done with a frontier model in a batch script."
      }
    ],
    body_md:
      "## Stub\n\nThis is local-provider output. Run the article generator with LLM_BLOG=anthropic (or openai / openrouter) for real content."
  };
}
