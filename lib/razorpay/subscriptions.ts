// Razorpay Subscriptions API: Plans + Subscriptions. Real call hits
// /v1/plans and /v1/subscriptions; mock fallback returns deterministic ids
// so the Plus signup flow can be exercised end-to-end without keys.

const RAZORPAY_API = "https://api.razorpay.com/v1";

const PLUS_PLAN_AMOUNT_PAISE = 999_00;
export const PLUS_PLAN_ID_KEY = "plus_yearly";

export interface PlanRef {
  plan_id: string;
}

export interface SubscriptionRef {
  subscription_id: string;
  short_url?: string; // hosted checkout
  status: string;
}

export async function ensurePlusPlan(): Promise<PlanRef> {
  const cached = process.env.RAZORPAY_PLUS_PLAN_ID;
  if (cached) return { plan_id: cached };

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return { plan_id: `plan_mock_${PLUS_PLAN_ID_KEY}` };
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch(`${RAZORPAY_API}/plans`, {
    method: "POST",
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      period: "yearly",
      interval: 1,
      item: {
        name: "LegalDesk Plus",
        amount: PLUS_PLAN_AMOUNT_PAISE,
        currency: "INR",
        description: "LegalDesk Plus annual subscription"
      },
      notes: { plan_key: PLUS_PLAN_ID_KEY }
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`razorpay plans.create ${res.status}: ${text.slice(0, 400)}`);
  }
  const data = (await res.json()) as { id: string };
  return { plan_id: data.id };
}

export async function createPlusSubscription(args: {
  user_id: string;
  user_email?: string | null;
  user_phone?: string | null;
}): Promise<SubscriptionRef> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const plan = await ensurePlusPlan();

  if (!keyId || !keySecret) {
    return {
      subscription_id: `sub_mock_${args.user_id.slice(0, 12)}`,
      status: "created"
    };
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch(`${RAZORPAY_API}/subscriptions`, {
    method: "POST",
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      plan_id: plan.plan_id,
      total_count: 1, // 1 yearly cycle; renewal handled at next billing
      customer_notify: 1,
      notes: {
        user_id: args.user_id,
        plan_key: PLUS_PLAN_ID_KEY
      },
      ...(args.user_email || args.user_phone
        ? {
            notify_info: {
              ...(args.user_email ? { notify_email: args.user_email } : {}),
              ...(args.user_phone ? { notify_phone: args.user_phone } : {})
            }
          }
        : {})
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`razorpay subscriptions.create ${res.status}: ${text.slice(0, 400)}`);
  }
  const data = (await res.json()) as {
    id: string;
    status: string;
    short_url?: string;
  };
  return {
    subscription_id: data.id,
    short_url: data.short_url,
    status: data.status
  };
}
