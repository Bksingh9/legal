import type { LLMProvider, ChatRequest, Workload } from "../types";

// Standard OpenAI chat completions, plus Azure OpenAI when OPENAI_BASE_URL
// is set to a Central India endpoint (e.g.
// https://my-resource.openai.azure.com/openai/deployments/<deployment>).
//
// Azure note: for Azure deployments the model name in the path differs from
// the public model id. Set OPENAI_DRAFT_MODEL to the deployment name on
// Azure; vanilla OpenAI uses gpt-4o etc directly.

const DEFAULT_BASE = "https://api.openai.com/v1";

function modelFor(workload: Workload): string {
  if (workload === "triage.classify") {
    return process.env.OPENAI_CLASSIFY_MODEL || "gpt-4o-mini";
  }
  return process.env.OPENAI_DRAFT_MODEL || "gpt-4o";
}

export const openaiProvider: LLMProvider = {
  name: "openai",
  available: () => !!process.env.OPENAI_API_KEY,
  async generate(req: ChatRequest) {
    const base = process.env.OPENAI_BASE_URL || DEFAULT_BASE;
    const model = modelFor(req.workload);
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...(process.env.OPENAI_AZURE_API_VERSION
          ? { "api-key": process.env.OPENAI_API_KEY as string }
          : {})
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
      throw new Error(`openai ${res.status}: ${text.slice(0, 400)}`);
    }
    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    if (!text) throw new Error("openai: empty response");
    return { text, provider: "openai", model };
  }
};
