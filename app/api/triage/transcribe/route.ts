import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Sarvam.ai for Indic STT. When SARVAM_API_KEY is unset the route
// returns 501 so the client knows server STT isn't available — at
// Tier-0 the browser-side Web Speech API in
// components/triage/voice-recorder.tsx covers the path. Public route:
// no auth gate so the triage funnel stays open.
const SARVAM_ENDPOINT = "https://api.sarvam.ai/speech-to-text";

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB cap per upload

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("audio");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing audio." }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Audio too small or too large." }, { status: 413 });
  }

  const sarvamKey = process.env.SARVAM_API_KEY;
  if (!sarvamKey) {
    // No paid STT configured. The browser-side Web Speech API path in
    // components/triage/voice-recorder.tsx covers Tier-0 cleanly; this
    // route is the explicit upgrade path. Return 501 so the client knows
    // to surface the "use Chrome/Edge or type" hint instead of pretending
    // it transcribed.
    return NextResponse.json(
      { error: "Server STT not configured.", mode: "mock" },
      { status: 501 }
    );
  }

  const upstream = new FormData();
  upstream.append("file", file, "audio.webm");
  upstream.append("model", "saarika:v2");
  upstream.append("language_code", "unknown");

  const res = await fetch(SARVAM_ENDPOINT, {
    method: "POST",
    headers: { "api-subscription-key": sarvamKey },
    body: upstream
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[triage/transcribe] sarvam failed", res.status, text.slice(0, 300));
    return NextResponse.json({ error: "Transcription failed." }, { status: 502 });
  }

  const data = (await res.json()) as { transcript?: string; language_code?: string };
  return NextResponse.json({
    ok: true,
    provider: "sarvam",
    language: data.language_code === "hi-IN" ? "hi" : "en",
    text: data.transcript ?? ""
  });
}
