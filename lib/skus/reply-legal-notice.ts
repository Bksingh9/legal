import { z } from "zod";
import type { SkuMeta } from "./types";

export const ReplyLegalNoticeInput = z.object({
  language: z.enum(["en", "hi"]).default("en"),
  our_party: z.object({
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
  opposing_party: z.object({
    name: z.string().trim().min(2).max(120),
    address: z.string().trim().min(8).max(400)
  }),
  original_notice: z.object({
    date_received: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
    sender_advocate: z.string().trim().max(160).optional(),
    subject_summary: z.string().trim().min(10).max(800)
  }),
  our_stance: z.enum(["deny", "admit", "partial"]),
  rebuttal_points: z
    .array(z.string().trim().min(8).max(800))
    .min(1)
    .max(8),
  counter_demand: z.string().trim().max(800).optional(),
  reservation_of_rights: z.boolean().default(true)
});

export type ReplyLegalNoticeInputType = z.infer<typeof ReplyLegalNoticeInput>;

export const meta: SkuMeta = {
  id: "reply-legal-notice",
  title: "Reply to legal notice",
  short_description:
    "Drafts a formal reply to a received legal notice with point-wise rebuttal and reservation of rights.",
  price_paise: 699_00,
  currency: "INR",
  schema: ReplyLegalNoticeInput,
  category: "notice",
  allow_addon_lawyer_review: true
};
