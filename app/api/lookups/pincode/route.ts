import { NextResponse } from "next/server";

// Indian PIN-code lookup. Tries the canonical postalpincode.in first
// (returns proper District + State), then falls back to zippopotam.us
// (locality-level data, less accurate "city" but reliable for state).
// Proxied server-side so neither upstream needs to be in our CSP and so
// we can edge-cache aggressively (PINs almost never change).
export const runtime = "edge";

const PIN_RE = /^[1-9][0-9]{5}$/;

type Postal = Array<{
  Status: "Success" | "Error";
  PostOffice?: Array<{ District: string; State: string }>;
}>;

type Zippo = {
  places?: Array<{ "place name": string; state: string }>;
};

async function tryPostal(code: string): Promise<{ city: string; state: string } | null> {
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${code}`, {
      headers: { accept: "application/json" },
      cache: "force-cache",
      next: { revalidate: 60 * 60 * 24 * 30 }
    });
    if (!res.ok) return null;
    const body = (await res.json()) as Postal;
    const first = body?.[0];
    const offices = first?.PostOffice ?? [];
    if (first?.Status !== "Success" || offices.length === 0) return null;
    return { city: offices[0].District, state: offices[0].State };
  } catch {
    return null;
  }
}

async function tryZippo(code: string): Promise<{ city: string; state: string } | null> {
  try {
    const res = await fetch(`https://api.zippopotam.us/in/${code}`, {
      headers: { accept: "application/json" },
      cache: "force-cache",
      next: { revalidate: 60 * 60 * 24 * 30 }
    });
    if (!res.ok) return null;
    const body = (await res.json()) as Zippo;
    const place = body.places?.[0];
    if (!place) return null;
    return { city: place["place name"], state: place.state };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code")?.trim() ?? "";
  if (!PIN_RE.test(code)) {
    return NextResponse.json({ error: "invalid_pincode" }, { status: 400 });
  }

  const resolved = (await tryPostal(code)) ?? (await tryZippo(code));
  if (!resolved) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return new NextResponse(
    JSON.stringify({ pincode: code, ...resolved }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400"
      }
    }
  );
}
