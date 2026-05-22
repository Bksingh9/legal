import { NextResponse } from "next/server";

// Country list with dial codes + flag emojis, powered by restcountries.com.
// Heavy upstream payload (1.5MB) so we strip to the four fields we use,
// cache for 30 days at the edge, and fall back to a baked-in subset of the
// top destinations if the upstream is down (rarely, but it happens).
export const runtime = "edge";

type Upstream = Array<{
  name: { common: string };
  cca2: string;
  flag: string;
  idd: { root: string; suffixes?: string[] };
}>;

type Country = { name: string; code: string; dial: string; flag: string };

const FALLBACK: Country[] = [
  { name: "India", code: "IN", dial: "+91", flag: "🇮🇳" },
  { name: "United States", code: "US", dial: "+1", flag: "🇺🇸" },
  { name: "United Kingdom", code: "GB", dial: "+44", flag: "🇬🇧" },
  { name: "United Arab Emirates", code: "AE", dial: "+971", flag: "🇦🇪" },
  { name: "Canada", code: "CA", dial: "+1", flag: "🇨🇦" },
  { name: "Australia", code: "AU", dial: "+61", flag: "🇦🇺" },
  { name: "Singapore", code: "SG", dial: "+65", flag: "🇸🇬" },
  { name: "Germany", code: "DE", dial: "+49", flag: "🇩🇪" },
  { name: "Saudi Arabia", code: "SA", dial: "+966", flag: "🇸🇦" },
  { name: "Malaysia", code: "MY", dial: "+60", flag: "🇲🇾" },
  { name: "Nepal", code: "NP", dial: "+977", flag: "🇳🇵" },
  { name: "Sri Lanka", code: "LK", dial: "+94", flag: "🇱🇰" },
  { name: "Qatar", code: "QA", dial: "+974", flag: "🇶🇦" },
  { name: "Oman", code: "OM", dial: "+968", flag: "🇴🇲" },
  { name: "Kuwait", code: "KW", dial: "+965", flag: "🇰🇼" }
];

function pickDial(idd: Upstream[number]["idd"]): string | null {
  if (!idd?.root) return null;
  const suffix = idd.suffixes?.[0] ?? "";
  return `${idd.root}${suffix}`;
}

export async function GET() {
  let countries: Country[] = FALLBACK;
  try {
    const upstream = await fetch(
      "https://restcountries.com/v3.1/all?fields=name,cca2,idd,flag",
      {
        headers: { accept: "application/json" },
        cache: "force-cache",
        next: { revalidate: 60 * 60 * 24 * 30 }
      }
    );
    if (upstream.ok) {
      const body = (await upstream.json()) as Upstream;
      countries = body
        .map((c) => {
          const dial = pickDial(c.idd);
          if (!dial) return null;
          return { name: c.name.common, code: c.cca2, dial, flag: c.flag };
        })
        .filter((c): c is Country => c !== null)
        .sort((a, b) => {
          // India first, then alphabetical — the common case is +91.
          if (a.code === "IN") return -1;
          if (b.code === "IN") return 1;
          return a.name.localeCompare(b.name);
        });
    }
  } catch {
    // fall through to FALLBACK
  }
  return new NextResponse(JSON.stringify(countries), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400"
    }
  });
}
