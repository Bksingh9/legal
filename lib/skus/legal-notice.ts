import { z } from "zod";
import type { SkuMeta } from "./types";

export const LegalNoticeInput = z.object({
  language: z.enum(["en", "hi"]).default("en"),
  sender: z.object({
    name: z.string().trim().min(2).max(120),
    address: z.string().trim().min(8).max(400),
    email: z.string().email().optional().or(z.literal("")),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 \-]{7,15}$/)
      .optional()
      .or(z.literal(""))
  }),
  recipient: z.object({
    name: z.string().trim().min(2).max(120),
    address: z.string().trim().min(8).max(400)
  }),
  cause: z.object({
    date_of_event: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
    place: z.string().trim().min(2).max(120),
    description: z.string().trim().min(20).max(2000)
  }),
  demand: z.object({
    summary: z.string().trim().min(8).max(800),
    amount_inr: z.number().int().min(0).max(100_00_00_000).optional(),
    deadline_days: z.number().int().min(3).max(180).default(15)
  }),
  legal_basis: z.string().trim().max(400).optional()
});

export type LegalNoticeInputType = z.infer<typeof LegalNoticeInput>;

export const meta: SkuMeta = {
  id: "legal-notice",
  title: "Legal notice (any cause)",
  short_description:
    "Drafts a formal legal notice to a counter-party demanding action within a stated deadline.",
  price_paise: 499_00,
  currency: "INR",
  schema: LegalNoticeInput,
  category: "notice",
  allow_addon_lawyer_review: true
};
