import { randomBytes } from "node:crypto";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { notifyUser, notifyMany, getAdminUserIds } from "@/lib/notify/inbox";
import { POLICY_VERSION } from "@/lib/policy/version";
import type { LawyerApplyInputType, LawyerSelfView } from "./types";

export interface LawyerRow {
  id: string;
  user_id: string;
  bar_council_id: string;
  state: string;
  specializations: string[];
  languages: string[];
  years_exp: number;
  rating: number;
  status: "pending" | "verified" | "suspended";
  payout_account: Record<string, unknown> | null;
  anon_slug: string;
  route_account_id: string | null;
  digilocker_uri: string | null;
  verified_at: string | null;
  verified_by: string | null;
  suspended_at: string | null;
  suspension_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationRow {
  id: string;
  user_id: string;
  lawyer_id: string | null;
  payload: LawyerApplyInputType;
  status: "submitted" | "in_review" | "approved" | "rejected";
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export async function upsertLawyerApplication(args: {
  userId: string;
  input: LawyerApplyInputType;
  routeAccountId: string | null;
}): Promise<{ lawyer: LawyerRow; application: ApplicationRow } | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;

  const { input } = args;

  const lawyerPayload = {
    user_id: args.userId,
    bar_council_id: input.bar_council_id,
    state: input.state,
    specializations: input.specializations,
    languages: input.languages,
    years_exp: input.years_exp,
    hours_per_week: input.hours_per_week,
    availability_note: input.availability_note ?? null,
    notification_email: input.payout.contact_email,
    notification_whatsapp: input.notification_whatsapp || input.payout.contact_phone,
    pan: input.pan,
    gstin: input.gstin || null,
    payout_account: input.payout,
    digilocker_uri: input.digilocker_uri ?? null,
    route_account_id: args.routeAccountId,
    anon_slug: randomBytes(6).toString("hex"),
    status: "pending" as const,
    updated_at: new Date().toISOString()
  };

  const { data: existing, error: selErr } = await supa
    .from("lawyers")
    .select("id, anon_slug")
    .eq("user_id", args.userId)
    .maybeSingle();

  if (selErr) {
    console.error("[lawyers] select existing", selErr);
    return null;
  }

  let lawyerRow: LawyerRow | null = null;
  if (existing) {
    // Preserve the existing anon_slug across re-submissions.
    const { data: updated, error: updErr } = await supa
      .from("lawyers")
      .update({ ...lawyerPayload, anon_slug: existing.anon_slug })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (updErr) {
      console.error("[lawyers] update", updErr);
      return null;
    }
    lawyerRow = updated as LawyerRow;
  } else {
    const { data: inserted, error: insErr } = await supa
      .from("lawyers")
      .insert(lawyerPayload)
      .select("*")
      .single();
    if (insErr) {
      console.error("[lawyers] insert", insErr);
      return null;
    }
    lawyerRow = inserted as LawyerRow;
  }

  const { data: appRow, error: appErr } = await supa
    .from("lawyer_applications")
    .insert({
      user_id: args.userId,
      lawyer_id: lawyerRow.id,
      payload: input,
      status: "submitted",
      consent_policy_version: POLICY_VERSION,
      consented_at: new Date().toISOString()
    })
    .select("*")
    .single();
  if (appErr) {
    console.error("[lawyers] application insert", appErr);
    return null;
  }

  // Notify every admin live that a new application landed in the queue.
  const adminUserIds = await getAdminUserIds();
  if (adminUserIds.length > 0) {
    await notifyMany(adminUserIds, {
      kind: "lawyer.application.new",
      title: existing
        ? "Lawyer application updated"
        : "New lawyer application",
      body: `${input.bar_council_id} · ${input.state} · ${input.years_exp}y`,
      link: "/admin/lawyers"
    });
  }

  return { lawyer: lawyerRow, application: appRow as ApplicationRow };
}

export async function getLawyerSelfView(userId: string): Promise<LawyerSelfView | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;
  const { data, error } = await supa
    .from("lawyers")
    .select(
      "id, anon_slug, bar_council_id, state, specializations, languages, years_exp, rating, status, route_account_id, verified_at, suspended_at, suspension_reason"
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[lawyers] getLawyerSelfView", error);
    return null;
  }
  if (!data) return null;
  return data as LawyerSelfView;
}

export async function listLawyersByStatus(args: {
  status: "pending" | "verified" | "suspended";
  limit?: number;
}): Promise<LawyerRow[]> {
  const supa = getSupabaseServiceClient();
  if (!supa) return [];
  const { data, error } = await supa
    .from("lawyers")
    .select("*")
    .eq("status", args.status)
    .order("created_at", { ascending: false })
    .limit(args.limit ?? 100);
  if (error) {
    console.error("[lawyers] listLawyersByStatus", error);
    return [];
  }
  return (data as LawyerRow[]) ?? [];
}

export async function verifyLawyer(args: {
  lawyerId: string;
  reviewerId: string;
  notes?: string;
}): Promise<LawyerRow | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;
  const now = new Date().toISOString();
  const { data, error } = await supa
    .from("lawyers")
    .update({
      status: "verified",
      verified_at: now,
      verified_by: args.reviewerId,
      suspended_at: null,
      suspension_reason: null,
      updated_at: now
    })
    .eq("id", args.lawyerId)
    .select("*")
    .single();
  if (error) {
    console.error("[lawyers] verifyLawyer", error);
    return null;
  }

  // Mark the latest application approved.
  await supa
    .from("lawyer_applications")
    .update({
      status: "approved",
      reviewed_by: args.reviewerId,
      reviewed_at: now,
      notes: args.notes ?? null
    })
    .eq("lawyer_id", args.lawyerId)
    .eq("status", "submitted");

  // Notify the lawyer live that they're now verified and eligible to
  // receive offer.new notifications.
  await notifyUser({
    userId: (data as LawyerRow).user_id,
    kind: "lawyer.verified",
    title: "Your lawyer profile is verified",
    body: "You'll now receive consultation offers as they come in.",
    link: "/lawyer"
  });

  return data as LawyerRow;
}

export async function suspendLawyer(args: {
  lawyerId: string;
  reviewerId: string;
  reason: string;
}): Promise<LawyerRow | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;
  const now = new Date().toISOString();
  const { data, error } = await supa
    .from("lawyers")
    .update({
      status: "suspended",
      suspended_at: now,
      suspension_reason: args.reason,
      updated_at: now
    })
    .eq("id", args.lawyerId)
    .select("*")
    .single();
  if (error) {
    console.error("[lawyers] suspendLawyer", error);
    return null;
  }

  await supa
    .from("lawyer_applications")
    .update({
      status: "rejected",
      reviewed_by: args.reviewerId,
      reviewed_at: now,
      notes: args.reason
    })
    .eq("lawyer_id", args.lawyerId)
    .in("status", ["submitted", "in_review", "approved"]);

  await notifyUser({
    userId: (data as LawyerRow).user_id,
    kind: "lawyer.suspended",
    title: "Your lawyer profile is suspended",
    body: args.reason.slice(0, 200),
    link: "/lawyer"
  });

  return data as LawyerRow;
}
