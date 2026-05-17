import { getSupabaseServiceClient } from "@/lib/supabase/server";

export interface RateLimitOptions {
  // Logical bucket name, e.g. "consult-leads", "triage", "doc-download".
  bucket: string;
  // Per-IP max in the window. Defaults to 120/min — generous enough that
  // the persona-test suite (which fires bursts of requests during e2e)
  // never trips it, tight enough that a real attacker can't spam.
  max?: number;
  // Window length in seconds. Defaults to 60.
  windowSec?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  resetAt: string;
}

// Extracts the client IP from common headers Vercel + Cloudflare set.
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

// Bypass mechanism for the prod-smoke test suite. Tests send the
// header with the value from RATE_LIMIT_BYPASS_KEY; production users
// never send it. The check is constant-time-safe enough for this
// purpose (header equality, not authentication).
function hasBypass(req: Request): boolean {
  const expected = process.env.RATE_LIMIT_BYPASS_KEY;
  if (!expected) return false;
  return req.headers.get("x-rate-limit-bypass") === expected;
}

// Calls the rate_limit_check Postgres function. If Supabase isn't
// configured (Tier-0 boot mode), always allows — the function lives
// in the same DB as the rest of the app, so there's nothing to fall
// back to.
export async function rateLimit(
  req: Request,
  opts: RateLimitOptions
): Promise<RateLimitResult> {
  if (hasBypass(req)) {
    return { allowed: true, count: 0, resetAt: new Date(Date.now() + 60_000).toISOString() };
  }
  const supa = getSupabaseServiceClient();
  if (!supa) {
    return { allowed: true, count: 0, resetAt: new Date(Date.now() + 60_000).toISOString() };
  }
  const ip = getClientIp(req);
  const key = `ip:${ip}:${opts.bucket}`;
  const max = opts.max ?? 120;
  const windowSec = opts.windowSec ?? 60;

  const { data, error } = await supa.rpc("rate_limit_check", {
    in_key: key,
    in_max: max,
    in_window_sec: windowSec
  });
  if (error || !data || data.length === 0) {
    // Fail open on infra error — observability will catch repeated
    // failures, never deny legitimate users due to our bug.
    console.error("[rate-limit] rpc failed", error);
    return { allowed: true, count: 0, resetAt: new Date(Date.now() + windowSec * 1000).toISOString() };
  }
  const row = data[0] as { allowed: boolean; count: number; reset_at: string };
  return { allowed: row.allowed, count: row.count, resetAt: row.reset_at };
}

// Convenience wrapper that returns a Response object directly when
// rate-limited. Caller uses it like:
//   const limited = await rateLimitOrReject(req, { bucket: "..." });
//   if (limited) return limited;
import { NextResponse } from "next/server";
export async function rateLimitOrReject(
  req: Request,
  opts: RateLimitOptions
): Promise<NextResponse | null> {
  const r = await rateLimit(req, opts);
  if (r.allowed) return null;
  const retryAfterSec = Math.max(
    1,
    Math.ceil((new Date(r.resetAt).getTime() - Date.now()) / 1000)
  );
  return NextResponse.json(
    { error: "Too many requests. Try again shortly.", retry_after: retryAfterSec },
    {
      status: 429,
      headers: { "retry-after": String(retryAfterSec) }
    }
  );
}
