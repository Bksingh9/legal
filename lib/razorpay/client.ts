import { createHmac, timingSafeEqual } from "node:crypto";

// Razorpay Orders API. We hit the HTTP endpoint directly rather than
// pulling in the razorpay npm SDK — orders + signature verification are
// the only surfaces we need.

const RAZORPAY_API = "https://api.razorpay.com/v1";

export const RAZORPAY_ENABLED =
  !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET;

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: "INR";
  receipt: string | null;
  status: "created" | "attempted" | "paid";
  notes: Record<string, string>;
}

export async function createOrder(args: {
  amount_paise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    // Mock mode — return a deterministic, clearly-fake order id so the
    // checkout UI can be exercised end-to-end during development.
    return {
      id: `order_mock_${Buffer.from(args.receipt).toString("hex").slice(0, 12)}`,
      amount: args.amount_paise,
      currency: "INR",
      receipt: args.receipt,
      status: "created",
      notes: args.notes ?? {}
    };
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch(`${RAZORPAY_API}/orders`, {
    method: "POST",
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      amount: args.amount_paise,
      currency: "INR",
      receipt: args.receipt,
      notes: args.notes ?? {}
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`razorpay orders.create ${res.status}: ${text.slice(0, 400)}`);
  }
  const data = (await res.json()) as RazorpayOrder;
  return data;
}

// Verifies the signature returned by Razorpay's checkout.js to the
// browser, which posts {razorpay_order_id, razorpay_payment_id, razorpay_signature}
// back to the success handler. The signature is HMAC-SHA256(orderId|paymentId, key_secret).
export function verifyPaymentSignature(args: {
  order_id: string;
  payment_id: string;
  signature: string;
}): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    // Mock mode accepts a literal "mock" signature so the test flow works.
    return args.signature === "mock";
  }
  const expected = createHmac("sha256", keySecret)
    .update(`${args.order_id}|${args.payment_id}`)
    .digest("hex");
  return safeEqual(expected, args.signature);
}

// Verifies the signature on the X-Razorpay-Signature header against the
// raw request body for webhook callbacks. The secret is the per-webhook
// secret configured in the Razorpay dashboard.
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return signature === "mock";
  }
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

// Issue a refund against a captured payment. Returns the Razorpay
// refund object. Falls back to a mock id when keys aren't configured.
export interface RazorpayRefund {
  id: string;
  payment_id: string;
  amount: number; // paise
  currency: "INR";
  status: "queued" | "pending" | "processed" | "failed";
}

export async function refundPayment(args: {
  payment_id: string;
  amount_paise?: number; // omit for full refund
  notes?: Record<string, string>;
}): Promise<RazorpayRefund> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return {
      id: `rfnd_mock_${args.payment_id.slice(-6)}`,
      payment_id: args.payment_id,
      amount: args.amount_paise ?? 0,
      currency: "INR",
      status: "processed"
    };
  }
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const body: Record<string, unknown> = { speed: "normal", notes: args.notes ?? {} };
  if (typeof args.amount_paise === "number") body.amount = args.amount_paise;
  const res = await fetch(
    `${RAZORPAY_API}/payments/${encodeURIComponent(args.payment_id)}/refund`,
    {
      method: "POST",
      headers: {
        authorization: `Basic ${auth}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`razorpay refund ${res.status}: ${text.slice(0, 400)}`);
  }
  return (await res.json()) as RazorpayRefund;
}

// Fetch a subscription's current state (used by the cron renewal job).
export interface RazorpaySubscription {
  id: string;
  status:
    | "created"
    | "authenticated"
    | "active"
    | "pending"
    | "halted"
    | "cancelled"
    | "completed"
    | "expired"
    | "paused";
  current_end: number; // epoch seconds
  paid_count: number;
  notes: Record<string, string>;
}

export async function fetchSubscription(
  subscriptionId: string
): Promise<RazorpaySubscription | null> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch(
    `${RAZORPAY_API}/subscriptions/${encodeURIComponent(subscriptionId)}`,
    { headers: { authorization: `Basic ${auth}` } }
  );
  if (!res.ok) return null;
  return (await res.json()) as RazorpaySubscription;
}
