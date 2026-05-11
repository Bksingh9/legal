// Shared types for the multi-provider LLM layer.
//
// Why an abstraction: the product was originally bound to Anthropic. Any
// new vendor (Azure OpenAI India for residency, Sarvam for Indic, Ollama
// for self-hosting, OpenRouter as a unified fallback) had to monkey-patch
// the client. This file plus lib/llm/router.ts is the only place that
// knows which backend serves which workload.

export type Workload =
  | "triage.classify"
  | "triage.prep"
  | "consult.summarize"
  | "blog.generate";

export interface ChatRequest {
  workload: Workload;
  system: string;
  user: string;
  max_tokens?: number;
  temperature?: number;
}

export interface ChatResult {
  text: string;
  provider: string;
  model: string;
}

export interface LLMProvider {
  readonly name: string;
  available(): boolean;
  generate(req: ChatRequest): Promise<ChatResult>;
}
