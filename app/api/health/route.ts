import { NextResponse } from "next/server";
import { describeRouting } from "@/lib/llm/router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "legaldesk-ai",
    time: new Date().toISOString(),
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
