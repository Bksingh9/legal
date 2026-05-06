import { z } from "zod";
import type { SkuMeta } from "./types";

export const RtiApplicationInput = z.object({
  language: z.enum(["en", "hi"]).default("en"),
  applicant: z.object({
    name: z.string().trim().min(2).max(120),
    address: z.string().trim().min(8).max(400),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 \-]{7,15}$/),
    email: z.string().email().optional().or(z.literal("")),
    is_indian_citizen: z.boolean().default(true),
    is_bpl: z.boolean().default(false)
  }),
  public_authority: z.object({
    name: z.string().trim().min(2).max(160),
    address: z.string().trim().min(8).max(400),
    pio_designation: z.string().trim().max(160).optional()
  }),
  subject: z.string().trim().min(8).max(200),
  information_sought: z
    .array(z.string().trim().min(8).max(800))
    .min(1)
    .max(10),
  period: z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.").optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.").optional()
  }).optional(),
  prefer_inspection: z.boolean().default(false)
});

export type RtiApplicationInputType = z.infer<typeof RtiApplicationInput>;

export const meta: SkuMeta = {
  id: "rti-application",
  title: "RTI application",
  short_description:
    "Right to Information Act 2005 application to a public authority's PIO.",
  price_paise: 199_00,
  currency: "INR",
  schema: RtiApplicationInput,
  category: "application",
  allow_addon_lawyer_review: false
};
