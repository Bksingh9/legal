import { NextResponse } from "next/server";

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
      razorpay: Boolean(process.env.RAZORPAY_KEY_ID),
      resend: Boolean(process.env.RESEND_API_KEY)
    }
  });
}
