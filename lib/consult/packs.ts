import { z } from "zod";
import { SPECIALIZATIONS, LAWYER_LANGUAGES } from "@/lib/lawyers/types";

export type PackId = "p15" | "p30" | "p60";

export interface ConsultPack {
  id: PackId;
  duration_min: 15 | 30 | 60;
  price_paise: number;
  title: string;
  description: string;
}

export const CONSULT_PACKS: Record<PackId, ConsultPack> = {
  p15: {
    id: "p15",
    duration_min: 15,
    price_paise: 199_00,
    title: "15-minute starter",
    description:
      "Quick read on whether your situation needs a lawyer and what the next step is."
  },
  p30: {
    id: "p30",
    duration_min: 30,
    price_paise: 349_00,
    title: "30-minute strategy",
    description:
      "Walk through your facts, the likely framework, and a concrete action plan."
  },
  p60: {
    id: "p60",
    duration_min: 60,
    price_paise: 599_00,
    title: "60-minute deep dive",
    description:
      "Full review with document feedback, drafting suggestions, and timeline."
  }
};

export function getPack(id: string): ConsultPack | null {
  return (CONSULT_PACKS as Record<string, ConsultPack>)[id] ?? null;
}

export function listPacks(): ConsultPack[] {
  return [CONSULT_PACKS.p15, CONSULT_PACKS.p30, CONSULT_PACKS.p60];
}

// ---------------------------------------------------------------------------
// Booking input schema
// ---------------------------------------------------------------------------
export const BookConsultInput = z.object({
  pack: z.enum(["p15", "p30", "p60"]),
  channel: z.enum(["call", "video"]),
  specialization: z.enum(SPECIALIZATIONS),
  language: z.enum(LAWYER_LANGUAGES),
  state: z.string().trim().min(2).max(40)
});
export type BookConsultInputType = z.infer<typeof BookConsultInput>;

// ---------------------------------------------------------------------------
// Payout split. Spec §3 Tier 3: lawyer takes 55-65% net of platform fee + GST.
// Settled at 60% with a 30% platform fee and a 10% GST buffer for now;
// finance can re-tune the constants without touching call sites.
// ---------------------------------------------------------------------------
export interface PayoutSplit {
  gross_paise: number;
  platform_fee_paise: number;
  gst_buffer_paise: number;
  lawyer_payout_paise: number;
}

export function computePayoutSplit(grossPaise: number): PayoutSplit {
  const lawyerPaise = Math.round(grossPaise * 0.6);
  const platformPaise = Math.round(grossPaise * 0.3);
  const gstPaise = grossPaise - lawyerPaise - platformPaise;
  return {
    gross_paise: grossPaise,
    platform_fee_paise: platformPaise,
    gst_buffer_paise: gstPaise,
    lawyer_payout_paise: lawyerPaise
  };
}
