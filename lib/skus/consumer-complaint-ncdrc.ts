import { z } from "zod";
import type { SkuMeta } from "./types";

export const ConsumerComplaintInput = z.object({
  language: z.enum(["en", "hi"]).default("en"),
  forum: z.enum(["district", "state", "national"]).default("district"),
  complainant: z.object({
    name: z.string().trim().min(2).max(120),
    address: z.string().trim().min(8).max(400),
    occupation: z.string().trim().max(120).optional(),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 \-]{7,15}$/),
    email: z.string().email().optional().or(z.literal(""))
  }),
  opposite_party: z.object({
    name: z.string().trim().min(2).max(160),
    address: z.string().trim().min(8).max(400)
  }),
  transaction: z.object({
    description: z.string().trim().min(10).max(2000),
    purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
    amount_inr: z.number().int().min(1).max(10_00_00_000),
    invoice_no: z.string().trim().max(80).optional()
  }),
  defect: z.string().trim().min(20).max(3000),
  prior_resolution_attempts: z.string().trim().max(2000).optional(),
  reliefs_sought: z
    .array(
      z.enum([
        "refund",
        "replacement",
        "repair",
        "compensation",
        "interest",
        "litigation_costs"
      ])
    )
    .min(1)
});

export type ConsumerComplaintInputType = z.infer<typeof ConsumerComplaintInput>;

export const meta: SkuMeta = {
  id: "consumer-complaint-ncdrc",
  title: "Consumer complaint (Consumer Protection Act 2019)",
  short_description:
    "District / State / National forum complaint format under the Consumer Protection Act 2019.",
  price_paise: 599_00,
  currency: "INR",
  schema: ConsumerComplaintInput,
  category: "complaint",
  allow_addon_lawyer_review: true
};
