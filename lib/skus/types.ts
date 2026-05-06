import type { ZodTypeAny } from "zod";

export type Currency = "INR";

// Schemas use zod's defaults / optionals which create input vs output type
// gaps. We keep the registry intentionally untyped (ZodTypeAny) and rely on
// each SKU module's own exported `*Input` schema for typed parsing.
export interface SkuMeta {
  id: string;
  title: string;
  short_description: string;
  price_paise: number;
  currency: Currency;
  schema: ZodTypeAny;
  category: "notice" | "agreement" | "complaint" | "application";
  // Whether the +₹499 lawyer-review add-on can be attached at checkout.
  allow_addon_lawyer_review: boolean;
}

export const LAWYER_REVIEW_ADDON_PAISE = 499_00;
