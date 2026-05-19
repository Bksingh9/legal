import { z } from "zod";
import type { SkuMeta } from "./types";

export const EmploymentNdaInput = z.object({
  language: z.enum(["en", "hi"]).default("en"),
  effective_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
  disclosing_party: z.object({
    name: z.string().trim().min(2).max(120),
    address: z.string().trim().min(8).max(400),
    state: z.string().trim().min(2).max(40)
  }),
  receiving_party: z.object({
    name: z.string().trim().min(2).max(120),
    address: z.string().trim().min(8).max(400),
    role: z.string().trim().min(2).max(120) // "Employee", "Contractor", etc.
  }),
  scope: z.string().trim().min(20).max(2000),
  confidential_items: z
    .array(z.string().trim().min(3).max(300))
    .min(1)
    .max(15),
  term_years: z.number().int().min(1).max(20).default(3),
  non_compete_months: z.number().int().min(0).max(36).default(0),
  governing_state: z.string().trim().min(2).max(40),
  jurisdiction_city: z.string().trim().min(2).max(80)
});

export type EmploymentNdaInputType = z.infer<typeof EmploymentNdaInput>;

export const meta: SkuMeta = {
  id: "employment-nda",
  title: "Employment NDA / offer letter",
  short_description:
    "Confidentiality and non-disclosure agreement for hiring an employee or contractor. Indian-jurisdiction; optional non-compete clause.",
  price_paise: 599_00,
  currency: "INR",
  schema: EmploymentNdaInput,
  category: "agreement",
  allow_addon_lawyer_review: true
};
