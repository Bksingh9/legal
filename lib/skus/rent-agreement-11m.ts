import { z } from "zod";
import type { SkuMeta } from "./types";

export const RentAgreementInput = z.object({
  language: z.enum(["en", "hi"]).default("en"),
  landlord: z.object({
    name: z.string().trim().min(2).max(120),
    address: z.string().trim().min(8).max(400),
    pan: z.string().trim().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/i).optional()
  }),
  tenant: z.object({
    name: z.string().trim().min(2).max(120),
    address: z.string().trim().min(8).max(400),
    pan: z.string().trim().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/i).optional()
  }),
  property: z.object({
    full_address: z.string().trim().min(10).max(500),
    type: z.enum(["1RK", "1BHK", "2BHK", "3BHK", "4BHK", "Studio", "Other"]),
    furnishing: z.enum(["unfurnished", "semi-furnished", "fully-furnished"])
  }),
  term: z.object({
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
  }),
  rent: z.object({
    monthly_inr: z.number().int().min(1_000).max(100_00_000),
    deposit_inr: z.number().int().min(0).max(100_00_000),
    payment_day_of_month: z.number().int().min(1).max(28).default(5),
    annual_increment_pct: z.number().min(0).max(20).default(0)
  }),
  city: z.string().trim().min(2).max(80),
  inclusions: z
    .array(z.enum(["parking", "society-maintenance", "water", "electricity", "internet"]))
    .default([]),
  restrictions: z.string().trim().max(1000).optional()
});

export type RentAgreementInputType = z.infer<typeof RentAgreementInput>;

export const meta: SkuMeta = {
  id: "rent-agreement-11m",
  title: "Rent agreement (11-month, residential)",
  short_description:
    "Standard 11-month residential rent agreement with inclusions, restrictions, and deposit terms.",
  price_paise: 399_00,
  currency: "INR",
  schema: RentAgreementInput,
  category: "agreement",
  allow_addon_lawyer_review: true
};
