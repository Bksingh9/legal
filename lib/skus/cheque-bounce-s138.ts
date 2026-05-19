import { z } from "zod";
import type { SkuMeta } from "./types";

// Statutory notice under Section 138 of the Negotiable Instruments
// Act, 1881. Must be served within 30 days of receipt of the bank's
// dishonour memo; demand-payment deadline is 15 days from receipt.

export const ChequeBounceS138Input = z.object({
  language: z.enum(["en", "hi"]).default("en"),
  drawee: z.object({
    name: z.string().trim().min(2).max(120),
    address: z.string().trim().min(8).max(400)
  }),
  drawer: z.object({
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
  cheque: z.object({
    number: z.string().trim().min(3).max(20),
    issued_on: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
    amount_inr: z.number().int().min(1).max(100_00_00_000),
    drawn_on_bank: z.string().trim().min(2).max(160),
    drawn_on_branch: z.string().trim().min(2).max(160)
  }),
  dishonour: z.object({
    presented_on: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
    bank_memo_dated: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
    reason: z.string().trim().min(3).max(200) // "insufficient funds", "exceeds arrangement", etc.
  }),
  underlying_transaction: z.string().trim().min(20).max(2000),
  legal_basis: z.string().trim().max(400).optional()
});

export type ChequeBounceS138InputType = z.infer<typeof ChequeBounceS138Input>;

export const meta: SkuMeta = {
  id: "cheque-bounce-s138",
  title: "Cheque bounce notice (S.138 NI Act)",
  short_description:
    "Statutory demand notice under Section 138 of the Negotiable Instruments Act, 1881. Must be served within 30 days of the bank memo; payee gets 15 days to pay.",
  price_paise: 699_00,
  currency: "INR",
  schema: ChequeBounceS138Input,
  category: "notice",
  allow_addon_lawyer_review: true
};
