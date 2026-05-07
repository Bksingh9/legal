import { getSupabaseServiceClient } from "@/lib/supabase/server";

export type SubscriptionStatus = "active" | "past_due" | "cancelled" | "expired";

export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan: "plus_yearly" | "business_basic" | "business_pro";
  status: SubscriptionStatus;
  started_at: string;
  renews_at: string | null;
  paid_until: string | null;
  razorpay_subscription_id: string | null;
  razorpay_plan_id: string | null;
  docs_used: number;
  consult_minutes_used: number;
}

export async function getActivePlus(userId: string): Promise<SubscriptionRow | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;
  const { data, error } = await supa
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("plan", "plus_yearly")
    .in("status", ["active", "past_due"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[subs] getActivePlus", error);
    return null;
  }
  return (data as SubscriptionRow) ?? null;
}

export async function recordSubscriptionStart(args: {
  userId: string;
  razorpaySubscriptionId: string;
  razorpayPlanId: string;
}): Promise<SubscriptionRow | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;
  const { data, error } = await supa
    .from("subscriptions")
    .insert({
      user_id: args.userId,
      plan: "plus_yearly",
      status: "active",
      razorpay_subscription_id: args.razorpaySubscriptionId,
      razorpay_plan_id: args.razorpayPlanId
    })
    .select("*")
    .single();
  if (error) {
    if ((error as { code?: string }).code === "23505") {
      // idempotent re-run on the same razorpay_subscription_id
      const { data: existing } = await supa
        .from("subscriptions")
        .select("*")
        .eq("razorpay_subscription_id", args.razorpaySubscriptionId)
        .maybeSingle();
      return (existing as SubscriptionRow) ?? null;
    }
    console.error("[subs] recordSubscriptionStart", error);
    return null;
  }
  return data as SubscriptionRow;
}

export async function markSubscriptionStatus(args: {
  razorpaySubscriptionId: string;
  status: SubscriptionStatus;
  paidUntil?: string;
}): Promise<void> {
  const supa = getSupabaseServiceClient();
  if (!supa) return;
  await supa
    .from("subscriptions")
    .update({
      status: args.status,
      paid_until: args.paidUntil ?? null,
      updated_at: new Date().toISOString()
    })
    .eq("razorpay_subscription_id", args.razorpaySubscriptionId);
}

// Plus entitlements per spec §3 Tier 4.
export interface PlusEntitlements {
  unlimited_documents: boolean;
  consult_minutes_per_year: number;
  consult_minutes_remaining: number;
  priority_callback: boolean; // <1h match SLA
  document_vault: boolean;
}

export function plusEntitlementsFor(sub: SubscriptionRow | null): PlusEntitlements {
  if (!sub || sub.status !== "active") {
    return {
      unlimited_documents: false,
      consult_minutes_per_year: 0,
      consult_minutes_remaining: 0,
      priority_callback: false,
      document_vault: false
    };
  }
  const cap = 60;
  return {
    unlimited_documents: true,
    consult_minutes_per_year: cap,
    consult_minutes_remaining: Math.max(0, cap - (sub.consult_minutes_used ?? 0)),
    priority_callback: true,
    document_vault: true
  };
}
