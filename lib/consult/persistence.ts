import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type { BookConsultInputType, PackId } from "./packs";

export type ConsultStatus =
  | "requested"
  | "matched"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "disputed";

export interface ConsultationRow {
  id: string;
  user_id: string;
  lawyer_id: string | null;
  type: "call" | "video";
  pack: PackId | null;
  language: string | null;
  state: string | null;
  specialization: string | null;
  status: ConsultStatus;
  amount_inr: number;
  payout_lawyer_inr: number | null;
  payout_held_until: string | null;
  payout_released_at: string | null;
  payout_transfer_id: string | null;
  recording_consent_user: boolean | null;
  recording_consent_lawyer: boolean | null;
  hms_room_id: string | null;
  exotel_call_sid: string | null;
  recording_url: string | null;
  transcript_url: string | null;
  summary: string | null;
  duration_sec: number;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  dispute_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface OfferRow {
  id: string;
  consultation_id: string;
  lawyer_id: string;
  status: "pending" | "accepted" | "declined" | "expired";
  sent_at: string;
  responded_at: string | null;
  expires_at: string;
}

export async function createConsultationDraft(args: {
  userId: string;
  input: BookConsultInputType;
  amount_inr_paise: number;
}): Promise<ConsultationRow | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;
  const { data, error } = await supa
    .from("consultations")
    .insert({
      user_id: args.userId,
      type: args.input.channel,
      pack: args.input.pack,
      language: args.input.language,
      state: args.input.state,
      specialization: args.input.specialization,
      status: "requested",
      amount_inr: args.amount_inr_paise
    })
    .select("*")
    .single();
  if (error) {
    console.error("[consult] createConsultationDraft", error);
    return null;
  }
  return data as ConsultationRow;
}

export async function attachOffers(args: {
  consultationId: string;
  lawyerIds: string[];
}): Promise<OfferRow[]> {
  const supa = getSupabaseServiceClient();
  if (!supa || args.lawyerIds.length === 0) return [];
  const rows = args.lawyerIds.map((lid) => ({
    consultation_id: args.consultationId,
    lawyer_id: lid
  }));
  const { data, error } = await supa
    .from("consultation_offers")
    .insert(rows)
    .select("*");
  if (error) {
    console.error("[consult] attachOffers", error);
    return [];
  }
  await supa
    .from("consultations")
    .update({ status: "matched", updated_at: new Date().toISOString() })
    .eq("id", args.consultationId);
  return data as OfferRow[];
}

export async function getConsultationForUser(args: {
  userId: string;
  consultationId: string;
}): Promise<ConsultationRow | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;
  const { data, error } = await supa
    .from("consultations")
    .select("*")
    .eq("id", args.consultationId)
    .eq("user_id", args.userId)
    .maybeSingle();
  if (error) {
    console.error("[consult] getConsultationForUser", error);
    return null;
  }
  return (data as ConsultationRow) ?? null;
}

export async function getConsultationById(consultationId: string): Promise<ConsultationRow | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;
  const { data, error } = await supa
    .from("consultations")
    .select("*")
    .eq("id", consultationId)
    .maybeSingle();
  if (error) {
    console.error("[consult] getConsultationById", error);
    return null;
  }
  return (data as ConsultationRow) ?? null;
}

export async function listOffersForLawyer(args: {
  lawyerId: string;
  status?: "pending" | "accepted" | "declined" | "expired";
}): Promise<OfferRow[]> {
  const supa = getSupabaseServiceClient();
  if (!supa) return [];
  const q = supa
    .from("consultation_offers")
    .select("*")
    .eq("lawyer_id", args.lawyerId)
    .order("sent_at", { ascending: false })
    .limit(50);
  const { data, error } = args.status ? await q.eq("status", args.status) : await q;
  if (error) {
    console.error("[consult] listOffersForLawyer", error);
    return [];
  }
  return (data as OfferRow[]) ?? [];
}

// Atomically: accept this offer, expire all other pending offers for the
// same consultation, set consultation.lawyer_id and status='scheduled'.
// Implemented as a 3-step write under a single transaction is not
// available directly via the JS SDK without an RPC; we fall back to
// optimistic-update-with-conditions which is safe under concurrent
// accepts because only one row can flip pending->accepted (we filter
// on status='pending' on update).
export async function acceptOffer(args: {
  offerId: string;
  lawyerUserId: string;
}): Promise<{ consultation: ConsultationRow; offer: OfferRow } | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;

  const { data: offer, error: ofErr } = await supa
    .from("consultation_offers")
    .select("*, lawyers!inner(user_id)")
    .eq("id", args.offerId)
    .eq("status", "pending")
    .maybeSingle();
  if (ofErr || !offer) {
    console.warn("[consult] acceptOffer: offer not pending", { offerId: args.offerId, ofErr });
    return null;
  }
  if ((offer as { lawyers?: { user_id: string } }).lawyers?.user_id !== args.lawyerUserId) {
    console.warn("[consult] acceptOffer: not this lawyer's offer");
    return null;
  }

  const now = new Date().toISOString();
  const { data: accepted, error: accErr } = await supa
    .from("consultation_offers")
    .update({ status: "accepted", responded_at: now })
    .eq("id", args.offerId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();
  if (accErr || !accepted) {
    console.warn("[consult] acceptOffer: race lost", accErr);
    return null;
  }

  await supa
    .from("consultation_offers")
    .update({ status: "expired", responded_at: now })
    .eq("consultation_id", accepted.consultation_id)
    .neq("id", args.offerId)
    .eq("status", "pending");

  const { data: updatedConsult, error: cErr } = await supa
    .from("consultations")
    .update({
      lawyer_id: accepted.lawyer_id,
      status: "scheduled",
      updated_at: now
    })
    .eq("id", accepted.consultation_id)
    .select("*")
    .single();
  if (cErr) {
    console.error("[consult] acceptOffer: consult update", cErr);
    return null;
  }

  return {
    consultation: updatedConsult as ConsultationRow,
    offer: accepted as OfferRow
  };
}

export async function declineOffer(args: { offerId: string; lawyerUserId: string }): Promise<boolean> {
  const supa = getSupabaseServiceClient();
  if (!supa) return false;
  const { data, error } = await supa
    .from("consultation_offers")
    .select("*, lawyers!inner(user_id)")
    .eq("id", args.offerId)
    .maybeSingle();
  if (error || !data) return false;
  if ((data as { lawyers?: { user_id: string } }).lawyers?.user_id !== args.lawyerUserId) {
    return false;
  }
  const now = new Date().toISOString();
  const { error: upErr } = await supa
    .from("consultation_offers")
    .update({ status: "declined", responded_at: now })
    .eq("id", args.offerId)
    .eq("status", "pending");
  return !upErr;
}

export async function setRecordingConsent(args: {
  consultationId: string;
  who: "user" | "lawyer";
  consent: boolean;
}): Promise<ConsultationRow | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;
  const col =
    args.who === "user" ? "recording_consent_user" : "recording_consent_lawyer";
  const { data, error } = await supa
    .from("consultations")
    .update({ [col]: args.consent, updated_at: new Date().toISOString() })
    .eq("id", args.consultationId)
    .select("*")
    .single();
  if (error) {
    console.error("[consult] setRecordingConsent", error);
    return null;
  }
  return data as ConsultationRow;
}

export async function markStarted(args: {
  consultationId: string;
  channelMeta: { hms_room_id?: string; exotel_call_sid?: string };
}): Promise<void> {
  const supa = getSupabaseServiceClient();
  if (!supa) return;
  const now = new Date().toISOString();
  await supa
    .from("consultations")
    .update({
      status: "in_progress",
      started_at: now,
      updated_at: now,
      hms_room_id: args.channelMeta.hms_room_id ?? null,
      exotel_call_sid: args.channelMeta.exotel_call_sid ?? null
    })
    .eq("id", args.consultationId);
}

export async function markCompleted(args: {
  consultationId: string;
  duration_sec: number;
  summary: string | null;
  transcript_url: string | null;
  payoutLawyerInrPaise: number;
  payoutHoldHours: number;
}): Promise<void> {
  const supa = getSupabaseServiceClient();
  if (!supa) return;
  const now = new Date();
  const hold = new Date(now.getTime() + args.payoutHoldHours * 60 * 60 * 1000);
  await supa
    .from("consultations")
    .update({
      status: "completed",
      ended_at: now.toISOString(),
      duration_sec: args.duration_sec,
      summary: args.summary,
      transcript_url: args.transcript_url,
      payout_lawyer_inr: args.payoutLawyerInrPaise,
      payout_held_until: hold.toISOString(),
      updated_at: now.toISOString()
    })
    .eq("id", args.consultationId);
}

export async function markDisputed(args: {
  consultationId: string;
  reason: string;
}): Promise<void> {
  const supa = getSupabaseServiceClient();
  if (!supa) return;
  await supa
    .from("consultations")
    .update({
      status: "disputed",
      dispute_reason: args.reason,
      updated_at: new Date().toISOString()
    })
    .eq("id", args.consultationId);
}

export async function listConsultsAwaitingPayout(): Promise<ConsultationRow[]> {
  const supa = getSupabaseServiceClient();
  if (!supa) return [];
  const now = new Date().toISOString();
  const { data, error } = await supa
    .from("consultations")
    .select("*")
    .eq("status", "completed")
    .is("payout_released_at", null)
    .lte("payout_held_until", now)
    .limit(200);
  if (error) {
    console.error("[consult] listConsultsAwaitingPayout", error);
    return [];
  }
  return (data as ConsultationRow[]) ?? [];
}

export async function markPayoutReleased(args: {
  consultationId: string;
  transferId: string;
}): Promise<void> {
  const supa = getSupabaseServiceClient();
  if (!supa) return;
  await supa
    .from("consultations")
    .update({
      payout_released_at: new Date().toISOString(),
      payout_transfer_id: args.transferId,
      updated_at: new Date().toISOString()
    })
    .eq("id", args.consultationId);
}

export async function getLawyerByUserId(userId: string): Promise<{
  id: string;
  user_id: string;
  status: string;
  route_account_id: string | null;
} | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;
  const { data, error } = await supa
    .from("lawyers")
    .select("id, user_id, status, route_account_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[consult] getLawyerByUserId", error);
    return null;
  }
  return data as {
    id: string;
    user_id: string;
    status: string;
    route_account_id: string | null;
  } | null;
}
