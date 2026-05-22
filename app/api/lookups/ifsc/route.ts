import { NextResponse } from "next/server";

// IFSC bank-code lookup powered by Razorpay's free ifsc.razorpay.com service.
// Server-side proxy so we can cache and avoid CSP allowlist work on the client.
export const runtime = "edge";

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

type Upstream = {
  BANK: string;
  BRANCH: string;
  CITY: string;
  STATE: string;
  IFSC: string;
  MICR?: string;
  ADDRESS?: string;
};

export async function GET(req: Request) {
  const code = (new URL(req.url).searchParams.get("code") ?? "").trim().toUpperCase();
  if (!IFSC_RE.test(code)) {
    return NextResponse.json({ error: "invalid_ifsc" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`https://ifsc.razorpay.com/${code}`, {
      headers: { accept: "application/json" },
      cache: "force-cache",
      next: { revalidate: 60 * 60 * 24 * 30 }
    });
    if (upstream.status === 404) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (!upstream.ok) {
      return NextResponse.json({ error: "lookup_failed" }, { status: 502 });
    }
    const body = (await upstream.json()) as Upstream;
    return new NextResponse(
      JSON.stringify({
        ifsc: body.IFSC,
        bank: body.BANK,
        branch: body.BRANCH,
        city: body.CITY,
        state: body.STATE
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400"
        }
      }
    );
  } catch {
    return NextResponse.json({ error: "lookup_failed" }, { status: 502 });
  }
}
