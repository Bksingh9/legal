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
