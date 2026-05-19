import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { notifyMany, getAdminUserIds } from "@/lib/notify/inbox";
import { classify as classifyLocal } from "@/lib/llm/local/classify";
import { POLICY_VERSION } from "@/lib/policy/version";
import { rateLimitOrReject } from "@/lib/rate-limit/check";
import { verifyTurnstile } from "@/lib/captcha/turnstile";
import { trackServerEvent } from "@/lib/analytics/posthog-node";

export const runtime = "nodejs";

const Body = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 \-]{7,15}$/, "Use a valid phone with country code."),
  email: z.string().email().optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  issue: z.string().trim().min(20).max(400),
  marketing_opt_in: z.boolean().optional().default(false),
  captcha_token: z.string().optional()
});

// Vakilsearch-style fast intake: name + phone + 1-line issue. Writes a
// lightweight `consultation_leads` row and pages every admin live so
// the call-back happens within the promised SLA. Zero-key.
export async function POST(req: Request) {
  // Rate limit before any work — 20 lead submissions per minute per IP
  // is generous for humans, restrictive for bots.
  const limited = await rateLimitOrReject(req, { bucket: "consult-leads", max: 20 });
  if (limited) return limited;

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch (e) {
    const msg =
      e instanceof z.ZodError
        ? e.issues.map((i) => i.message).join("; ")
        : "Invalid input.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Optional bot check (no-op when CF_TURNSTILE_SECRET is unset).
  const captcha = await verifyTurnstile(parsed.captcha_token);
  if (!captcha.ok) {
    return NextResponse.json(
      { error: "Captcha verification failed." },
      { status: 400 }
    );
  }

  // Local-LLM classification (deterministic templates, no API key) so
  // the admin sees the issue area at a glance.
  let inferred: string | null = null;
  try {
    const c = classifyLocal(parsed.issue);
    inferred = c.classification;
  } catch {
    /* non-fatal */
  }

  const supa = getSupabaseServiceClient();
  if (!supa) {
    // Tier-0 no-Supabase mode: accept the lead but don't persist.
    return NextResponse.json({
      ok: true,
      persisted: false,
      lead_id: null,
      callback_eta: "10 minutes"
    });
  }

  const { data: row, error } = await supa
    .from("consultation_leads")
    .insert({
      name: parsed.name,
      phone: parsed.phone,
      email: parsed.email || null,
      city: parsed.city || null,
      issue: parsed.issue,
      inferred_specialization: inferred,
      consent_policy_version: POLICY_VERSION,
      consented_at: new Date().toISOString(),
      marketing_opt_in: parsed.marketing_opt_in
    })
    .select("id")
    .single();
  if (error || !row) {
    console.error("[consult-leads] insert failed", error);
    return NextResponse.json({ error: "Could not save lead." }, { status: 500 });
  }

  // Page every admin live so the call-back happens within SLA.
  const adminIds = await getAdminUserIds();
  if (adminIds.length > 0) {
    await notifyMany(adminIds, {
      kind: "lawyer.application.new", // reuse the "admin needs to look" kind
      title: "New call-back lead",
      body: `${parsed.name} · ${parsed.phone} · ${inferred ?? "general"}`,
      link: "/admin/leads"
    });
  }

  // Analytics fire-and-forget.
  void trackServerEvent(row.id, "lead.submitted", {
    inferred_specialization: inferred,
    has_city: Boolean(parsed.city),
    has_email: Boolean(parsed.email)
  });

  return NextResponse.json({
    ok: true,
    persisted: true,
    lead_id: row.id,
    callback_eta: "10 minutes"
  });
}
