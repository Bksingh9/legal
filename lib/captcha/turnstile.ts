// Cloudflare Turnstile token verification. Free, zero per-request cost.
// When CF_TURNSTILE_SECRET is unset, this is a no-op (returns ok=true)
// so the Tier-0 contract holds. Wire the keys later when you want
// real bot protection on /talk-to-lawyer / /lawyer/apply / /auth/signup.

export interface TurnstileResult {
  ok: boolean;
  error?: string;
}

export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.CF_TURNSTILE_SECRET);
}

export async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp?: string
): Promise<TurnstileResult> {
  const secret = process.env.CF_TURNSTILE_SECRET;
  if (!secret) return { ok: true }; // Tier-0: no captcha configured.
  if (!token) return { ok: false, error: "Missing captcha token." };

  const params = new URLSearchParams();
  params.set("secret", secret);
  params.set("response", token);
  if (remoteIp) params.set("remoteip", remoteIp);

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: params.toString()
      }
    );
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (data.success) return { ok: true };
    return { ok: false, error: (data["error-codes"] ?? ["unknown"]).join(",") };
  } catch (err) {
    console.error("[turnstile] verify failed", err);
    // Fail open on infra error.
    return { ok: true };
  }
}
