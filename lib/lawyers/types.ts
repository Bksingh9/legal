import { z } from "zod";

// Master spec list. Mirrors the surfaces in spec §3 Tier 1 and is the
// source of truth for both the apply form and the W9-10 match filter.
export const SPECIALIZATIONS = [
  "criminal",
  "civil",
  "family",
  "property",
  "consumer",
  "labour",
  "corporate",
  "tax",
  "cyber",
  "other"
] as const;
export type Specialization = (typeof SPECIALIZATIONS)[number];

export const LAWYER_LANGUAGES = [
  "en",
  "hi",
  "ta",
  "te",
  "kn",
  "ml",
  "mr",
  "bn",
  "gu",
  "pa"
] as const;
export type LawyerLanguage = (typeof LAWYER_LANGUAGES)[number];

const IFSC_RX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const VPA_RX = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z0-9.-]{2,}$/;

export const LawyerApplyInput = z.object({
  bar_council_id: z.string().trim().min(4).max(40),
  state: z.string().trim().min(2).max(40),
  years_exp: z.number().int().min(0).max(60),
  specializations: z.array(z.enum(SPECIALIZATIONS)).min(1).max(5),
  languages: z.array(z.enum(LAWYER_LANGUAGES)).min(1).max(6),
  hours_per_week: z.number().int().min(1).max(60).default(5),
  availability_note: z.string().trim().max(200).optional(),
  notification_whatsapp: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{7,15}$/)
    .optional()
    .or(z.literal("")),
  payout: z.object({
    legal_business_name: z.string().trim().min(2).max(120),
    contact_name: z.string().trim().min(2).max(120),
    contact_email: z.string().email(),
    contact_phone: z.string().trim().regex(/^\+?[0-9]{7,15}$/),
    upi_vpa: z.string().trim().regex(VPA_RX).optional().or(z.literal("")),
    bank_account_no: z.string().trim().regex(/^[0-9]{6,20}$/).optional().or(z.literal("")),
    bank_ifsc: z.string().trim().regex(IFSC_RX).optional().or(z.literal(""))
  }).refine(
    (v) =>
      (v.upi_vpa && v.upi_vpa.length > 0) ||
      (v.bank_account_no && v.bank_account_no.length > 0 && v.bank_ifsc && v.bank_ifsc.length > 0),
    { message: "Provide either a UPI VPA or a bank account number plus IFSC." }
  ),
  digilocker_uri: z.string().url().optional()
});

export type LawyerApplyInputType = z.infer<typeof LawyerApplyInput>;

// What an authenticated lawyer sees about their own profile.
export interface LawyerSelfView {
  id: string;
  anon_slug: string;
  bar_council_id: string;
  state: string;
  specializations: Specialization[];
  languages: LawyerLanguage[];
  years_exp: number;
  rating: number;
  status: "pending" | "verified" | "suspended";
  route_account_id: string | null;
  verified_at: string | null;
  suspended_at: string | null;
  suspension_reason: string | null;
}

// What another user (or the matching algorithm) is allowed to see.
// BCI Rule 36: never name, email, phone, photo, bar council id.
export interface LawyerAnonCard {
  anon_slug: string;
  state: string;
  specializations: Specialization[];
  languages: LawyerLanguage[];
  years_exp: number;
  rating: number;
}
