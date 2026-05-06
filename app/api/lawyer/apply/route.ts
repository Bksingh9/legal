import { NextResponse } from "next/server";
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

  const userId = await getCurrentUserId();
  if (!userId) {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: "Sign in." }, { status: 401 });
    }
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
    // Razorpay Route account creation failures should not block the
    // application; the admin can retry from the verification flow.
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
    application_id: result.application.id
  });
}
