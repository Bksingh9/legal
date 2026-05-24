// Tier 5 B2B plans (SPEC §3: ₹4,999–₹19,999/month). Quota is documents per
// calendar month; a quota of 0 means unlimited. Prices are paise for parity
// with the rest of the payment code.
export type OrgPlan = "starter" | "growth" | "scale";

export interface PlanDef {
  id: OrgPlan;
  title: string;
  price_paise: number;
  monthly_doc_quota: number; // 0 = unlimited
}

export const ORG_PLANS: Record<OrgPlan, PlanDef> = {
  starter: { id: "starter", title: "Business Starter", price_paise: 4_999_00, monthly_doc_quota: 100 },
  growth: { id: "growth", title: "Business Growth", price_paise: 9_999_00, monthly_doc_quota: 500 },
  scale: { id: "scale", title: "Business Scale", price_paise: 19_999_00, monthly_doc_quota: 0 }
};

export const ORG_PLAN_IDS = Object.keys(ORG_PLANS) as OrgPlan[];

export function planQuota(plan: OrgPlan): number {
  return ORG_PLANS[plan].monthly_doc_quota;
}

// Current metering period, 'YYYY-MM' in UTC.
export function currentPeriod(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}
