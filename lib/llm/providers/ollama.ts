import type { LLMProvider, ChatRequest, Workload } from "../types";

// Local self-hosted via Ollama. Used in dev to avoid spending tokens and in
// production by teams who run their own GPU box for residency reasons.
// Set OLLAMA_BASE_URL to enable (defaults to http://localhost:11434 when
// that var is set). Models default to llama3.1:8b — pull with
//   ollama pull llama3.1:8b
// before first run.

function modelFor(workload: Workload): string {
  if (workload === "triage.classify") {
    return process.env.OLLAMA_CLASSIFY_MODEL || "llama3.1:8b";
  }
  return process.env.OLLAMA_DRAFT_MODEL || "llama3.1:8b";
}

export const ollamaProvider: LLMProvider = {
  name: "ollama",
  available: () => !!process.env.OLLAMA_BASE_URL,
  async generate(req: ChatRequest) {
    const base = process.env.OLLAMA_BASE_URL as string;
    const model = modelFor(req.workload);
    const res = await fetch(`${base.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        format: "json",
        options: {
          temperature: req.temperature ?? 0,
          num_predict: req.max_tokens ?? 1500
        },
        messages: [
          { role: "system", content: req.system },
          { role: "user", content: req.user }
        ]
      })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ollama ${res.status}: ${text.slice(0, 400)}`);
    }
    const data = (await res.json()) as { message?: { content: string } };
    if (!data.message?.content) throw new Error("ollama: empty response");
    return { text: data.message.content, provider: "ollama", model };
  }
};
