import type { LLMProvider, ChatRequest, Workload } from "../types";

// OpenRouter — unified gateway across Anthropic, OpenAI, Google, Mistral,
// Meta, etc. One bill, swap models per workload via env. Useful as a
// runtime fallback when the primary provider 500s.

function modelFor(workload: Workload): string {
  if (workload === "triage.classify") {
    return process.env.OPENROUTER_CLASSIFY_MODEL || "anthropic/claude-haiku-4.5";
  }
  return process.env.OPENROUTER_DRAFT_MODEL || "anthropic/claude-sonnet-4.5";
}

export const openrouterProvider: LLMProvider = {
  name: "openrouter",
  available: () => !!process.env.OPENROUTER_API_KEY,
  async generate(req: ChatRequest) {
    const model = modelFor(req.workload);
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://legaldesk.ai",
        "X-Title": "LegalDesk AI"
      },
      body: JSON.stringify({
        model,
        max_tokens: req.max_tokens ?? 1500,
        temperature: req.temperature ?? 0,
        messages: [
          { role: "system", content: req.system },
          { role: "user", content: req.user }
        ]
      })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`openrouter ${res.status}: ${text.slice(0, 400)}`);
    }
    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    if (!text) throw new Error("openrouter: empty response");
    return { text, provider: "openrouter", model };
  }
};
