import { anthropicProvider } from "./providers/anthropic";
import { openaiProvider } from "./providers/openai";
import { ollamaProvider } from "./providers/ollama";
import { openrouterProvider } from "./providers/openrouter";
import { sarvamProvider } from "./providers/sarvam";
import { mockProvider } from "./providers/mock";
import type { ChatRequest, ChatResult, LLMProvider, Workload } from "./types";

// Provider registry. New backends just drop in here.
const PROVIDERS: Record<string, LLMProvider> = {
  anthropic: anthropicProvider,
  openai: openaiProvider,
  ollama: ollamaProvider,
  openrouter: openrouterProvider,
  sarvam: sarvamProvider,
  mock: mockProvider
};

// Per-workload env selector. Operators flip these on Vercel to switch
// backends per call site without touching code.
const ENV_BY_WORKLOAD: Record<Workload, string> = {
  "triage.classify": "LLM_CLASSIFY",
  "triage.prep": "LLM_DRAFT",
  "consult.summarize": "LLM_SUMMARIZE",
  "blog.generate": "LLM_BLOG"
};

// When the operator hasn't picked a provider for a workload, fall through
// in this order. Anthropic stays first for back-compat with the original
// deploy. Mock is the universal terminator so nothing 5xxs on a fresh
// checkout.
const FALLBACK_ORDER: string[] = [
  "anthropic",
  "openai",
  "openrouter",
  "sarvam",
  "ollama",
  "mock"
];

export function pickProvider(workload: Workload): LLMProvider {
  const envKey = ENV_BY_WORKLOAD[workload];
  const requested = process.env[envKey]?.toLowerCase();
  if (requested && PROVIDERS[requested]?.available()) {
    return PROVIDERS[requested];
  }
  for (const name of FALLBACK_ORDER) {
    const p = PROVIDERS[name];
    if (p && p.available()) return p;
  }
  return mockProvider;
}

export async function generate(req: ChatRequest): Promise<ChatResult> {
  return pickProvider(req.workload).generate(req);
}

export function describeRouting(): Record<Workload, string> {
  return {
    "triage.classify": pickProvider("triage.classify").name,
    "triage.prep": pickProvider("triage.prep").name,
    "consult.summarize": pickProvider("consult.summarize").name,
    "blog.generate": pickProvider("blog.generate").name
  };
}
