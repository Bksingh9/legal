import { anthropicProvider } from "./providers/anthropic";
import { openaiProvider } from "./providers/openai";
import { ollamaProvider } from "./providers/ollama";
import { openrouterProvider } from "./providers/openrouter";
import { sarvamProvider } from "./providers/sarvam";
import { localProvider } from "./providers/local";
import { mockProvider } from "./providers/mock";
import type { ChatRequest, ChatResult, LLMProvider, Workload } from "./types";

// Provider registry. New backends just drop in here.
const PROVIDERS: Record<string, LLMProvider> = {
  anthropic: anthropicProvider,
  openai: openaiProvider,
  ollama: ollamaProvider,
  openrouter: openrouterProvider,
  sarvam: sarvamProvider,
  local: localProvider,
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

// Fallback order when no selector is set. `local` runs first because it
// needs no API key, no network call, no third-party dependency, and is
// BCI Rule 36 compliant by construction. Paid providers are opt-in via
// the LLM_* env selectors.
const FALLBACK_ORDER: string[] = [
  "local",
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
