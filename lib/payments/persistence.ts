import { getSupabaseServiceClient } from "@/lib/supabase/server";

export type PaymentStatus =
  | "created"
  | "authorized"
  | "captured"
  | "failed"
  | "refunded";

export interface PaymentRow {
  id: string;
  user_id: string;
  document_id: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  amount: number; // paise
  currency: "INR";
  status: PaymentStatus;
  sku: string;
  idempotency_key: string;
  captured_at: string | null;
  created_at: string;
}

export async function upsertCreatedPayment(args: {
  userId: string;
  documentId: string;
  sku: string;
  amount_paise: number;
  razorpay_order_id: string;
  idempotency_key: string;
}): Promise<PaymentRow | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;

  const { data, error } = await supa
    .from("payments")
    .upsert(
      {
        user_id: args.userId,
        document_id: args.documentId,
        sku: args.sku,
        amount: args.amount_paise,
        currency: "INR",
        status: "created",
        razorpay_order_id: args.razorpay_order_id,
        idempotency_key: args.idempotency_key
      },
      { onConflict: "idempotency_key" }
    )
    .select("*")
    .single();

  if (error) {
    console.error("[payments] upsertCreatedPayment", error);
    return null;
  }
  return data as PaymentRow;
}

export async function getPaymentByOrderId(orderId: string): Promise<PaymentRow | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;
  const { data, error } = await supa
    .from("payments")
    .select("*")
    .eq("razorpay_order_id", orderId)
    .maybeSingle();
  if (error) {
    console.error("[payments] getPaymentByOrderId", error);
    return null;
  }
  return (data as PaymentRow) ?? null;
}

export async function markCaptured(args: {
  orderId: string;
  paymentId: string;
}): Promise<PaymentRow | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;
  const { data, error } = await supa
    .from("payments")
    .update({
      status: "captured",
      razorpay_payment_id: args.paymentId,
      captured_at: new Date().toISOString()
    })
    .eq("razorpay_order_id", args.orderId)
    .select("*")
    .single();
  if (error) {
    console.error("[payments] markCaptured", error);
    return null;
  }
  return data as PaymentRow;
}
