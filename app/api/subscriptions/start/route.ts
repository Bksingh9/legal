import { NextResponse } from "next/server";
import { createPlusSubscription, ensurePlusPlan } from "@/lib/razorpay/subscriptions";
import { recordSubscriptionStart } from "@/lib/subscriptions/persistence";
import { getCurrentUserId } from "@/lib/triage/persistence";
import { getUserContact } from "@/lib/users/persistence";

export const runtime = "nodejs";

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: "Sign in." }, { status: 401 });
    }
    return NextResponse.json({
      ok: true,
      mock: true,
      subscription_id: "sub_mock",
      checkout_url: "https://example.com/sub_mock"
    });
  }

  const contact = await getUserContact(userId);
  const plan = await ensurePlusPlan();
  const sub = await createPlusSubscription({
    user_id: userId,
    user_email: contact?.email,
    user_phone: contact?.phone
  });

  await recordSubscriptionStart({
    userId,
    razorpaySubscriptionId: sub.subscription_id,
    razorpayPlanId: plan.plan_id
  });

  return NextResponse.json({
    ok: true,
    subscription_id: sub.subscription_id,
    plan_id: plan.plan_id,
    status: sub.status,
    checkout_url: sub.short_url ?? null
  });
}
