import { NextResponse } from "next/server";
import { describeRouting } from "@/lib/llm/router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Vercel exposes these as system env vars when the project is deployed
// through its Git integration. Locally they're undefined -> id = "dev".
function buildId(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  return sha ? sha.slice(0, 7) : "dev";
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "legaldesk-ai",
    time: new Date().toISOString(),
    build: {
      id: buildId(),
      sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      ref: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      env: process.env.VERCEL_ENV ?? null
    },
    deps: {
      supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
      openai: Boolean(process.env.OPENAI_API_KEY),
      ollama: Boolean(process.env.OLLAMA_BASE_URL),
      openrouter: Boolean(process.env.OPENROUTER_API_KEY),
      sarvam: Boolean(process.env.SARVAM_API_KEY),
      razorpay: Boolean(process.env.RAZORPAY_KEY_ID),
      resend: Boolean(process.env.RESEND_API_KEY),
      aisensy: Boolean(process.env.AISENSY_API_KEY),
      exotel: Boolean(process.env.EXOTEL_SID),
      hms: Boolean(process.env.HMS_ACCESS_KEY)
    },
    llm_routing: describeRouting()
  });
}
