import type { LLMProvider, ChatRequest, Workload } from "../types";

// Sarvam chat (Indic-strong models, India-hosted). Sarvam STT is wired
// separately in lib/sarvam/... — keep that env var (SARVAM_API_KEY) as
// the source of truth so STT and chat share one key.

function modelFor(_workload: Workload): string {
  return process.env.SARVAM_CHAT_MODEL || "sarvam-m";
}

export const sarvamProvider: LLMProvider = {
  name: "sarvam",
  available: () => !!process.env.SARVAM_API_KEY,
  async generate(req: ChatRequest) {
    const model = modelFor(req.workload);
    const res = await fetch("https://api.sarvam.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "api-subscription-key": process.env.SARVAM_API_KEY as string
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
      throw new Error(`sarvam ${res.status}: ${text.slice(0, 400)}`);
    }
    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    if (!text) throw new Error("sarvam: empty response");
    return { text, provider: "sarvam", model };
  }
};
