import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { LawyerApplyInput } from "@/lib/lawyers/types";
import { getCurrentUserId } from "@/lib/triage/persistence";
import { upsertLawyerApplication } from "@/lib/lawyers/persistence";
import { createLinkedAccount } from "@/lib/razorpay/route";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = LawyerApplyInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.format() },
      { status: 400 }
    );
  }

  let userId = await getCurrentUserId();
  let magicLinkSent = false;

  // Anonymous applicant: provision an auth user from the form's contact
  // email + phone, then send a magic-link so they can sign back in to
  // their dashboard. We use the service-role admin client; this is the
  // same pattern the e2e test setup uses.
  if (!userId && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!serviceRole || !anonKey) {
      return NextResponse.json({ error: "Auth misconfigured." }, { status: 500 });
    }
    const admin = createClient(supaUrl, serviceRole, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const email = parsed.data.payout.contact_email;

    // Idempotent createUser: if the email already exists, look it up.
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { source: "lawyer-apply" }
    });
    if (created?.user) {
      userId = created.user.id;
    } else if (createErr && /registered|exists/i.test(createErr.message)) {
      const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
      const existing = list.users.find((u) => u.email === email);
      if (existing) userId = existing.id;
    }
    if (!userId) {
      return NextResponse.json(
        { error: "Could not create your account. Please try a different email." },
        { status: 500 }
      );
    }

    // Send a magic link so they can sign in later. Best-effort — failures
    // (e.g. Supabase free-tier 3/hr rate limit) shouldn't block the
    // application from being saved.
    const origin = new URL(req.url).origin;
    try {
      const anonClient = createClient(supaUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      const { error: otpErr } = await anonClient.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${origin}/auth/callback?next=/lawyer` }
      });
      if (!otpErr) magicLinkSent = true;
      else if (!/rate.?limit/i.test(otpErr.message)) {
        console.warn("[lawyer/apply] otp send failed", otpErr.message);
      }
    } catch (err) {
      console.warn("[lawyer/apply] otp dispatch threw", err);
    }
  }

  if (!userId) {
    // Tier-0 mock (no Supabase configured at all): keep the old shape.
    return NextResponse.json({
      ok: true,
      persisted: false,
      mock: true,
      lawyer_id: "lawyer_mock",
      anon_slug: "mock0123",
      status: "pending"
    });
  }

  let routeAccountId: string | null = null;
  try {
    const linked = await createLinkedAccount({
      email: parsed.data.payout.contact_email,
      phone: parsed.data.payout.contact_phone,
      legal_business_name: parsed.data.payout.legal_business_name,
      contact_name: parsed.data.payout.contact_name,
      ifsc: parsed.data.payout.bank_ifsc || undefined,
      account_number: parsed.data.payout.bank_account_no || undefined,
      beneficiary_name: parsed.data.payout.contact_name
    });
    routeAccountId = linked.id;
  } catch (err) {
    console.error("[lawyer/apply] razorpay route failed", err);
  }

  const result = await upsertLawyerApplication({
    userId,
    input: parsed.data,
    routeAccountId
  });

  if (!result) {
    return NextResponse.json({ error: "Could not save application." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    persisted: true,
    lawyer_id: result.lawyer.id,
    anon_slug: result.lawyer.anon_slug,
    status: result.lawyer.status,
    route_account_id: result.lawyer.route_account_id,
    application_id: result.application.id,
    check_email: magicLinkSent
  });
}
