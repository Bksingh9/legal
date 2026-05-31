import { NextResponse } from "next/server";
import { describeRouting } from "@/lib/llm/router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// VERCEL_GIT_COMMIT_* are only populated on Git-integration deploys; on
// CLI deploys (`vercel deploy`) they're empty strings. VERCEL_DEPLOYMENT_ID
// is always set on Vercel and gives a unique per-build id we can show.
function nz(s: string | undefined): string | null {
  return s && s.length > 0 ? s : null;
}
function buildId(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (sha && sha.length >= 7) return sha.slice(0, 7);
  return process.env.VERCEL_DEPLOYMENT_ID || "dev";
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "legaldesk-ai",
    time: new Date().toISOString(),
    build: {
      id: buildId(),
      sha: nz(process.env.VERCEL_GIT_COMMIT_SHA),
      ref: nz(process.env.VERCEL_GIT_COMMIT_REF),
      env: nz(process.env.VERCEL_ENV),
      deployment_id: nz(process.env.VERCEL_DEPLOYMENT_ID)
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
