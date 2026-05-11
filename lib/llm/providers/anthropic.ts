import type { LLMProvider, ChatRequest, Workload } from "../types";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

function modelFor(workload: Workload): string {
  if (workload === "triage.classify") {
    return process.env.ANTHROPIC_CLASSIFY_MODEL || "claude-haiku-4-5-20251001";
  }
  return process.env.ANTHROPIC_TRIAGE_MODEL || "claude-sonnet-4-6";
}

export const anthropicProvider: LLMProvider = {
  name: "anthropic",
  available: () => !!process.env.ANTHROPIC_API_KEY,
  async generate(req: ChatRequest) {
    const model = modelFor(req.workload);
    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": process.env.ANTHROPIC_API_KEY as string
      },
      body: JSON.stringify({
        model,
        max_tokens: req.max_tokens ?? 1500,
        ...(typeof req.temperature === "number" ? { temperature: req.temperature } : {}),
        system: [
          {
            type: "text",
            text: req.system,
            cache_control: { type: "ephemeral" }
          }
        ],
        messages: [{ role: "user", content: req.user }]
      })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`anthropic ${res.status}: ${text.slice(0, 400)}`);
    }
    const data = (await res.json()) as {
      content: Array<{ type: string; text?: string }>;
    };
    const block = data.content.find((b) => b.type === "text");
    if (!block?.text) throw new Error("anthropic: empty response");
    return { text: block.text, provider: "anthropic", model };
  }
};
