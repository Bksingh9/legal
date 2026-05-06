// Helpers around the queries table for the triage flow. All write paths
// use the service-role client so server-side mutations can stamp the
// row regardless of the user's session being passed in cookies.

import { getSupabaseServiceClient, getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  TriageClassification,
  CasePrep,
  Classification,
  Urgency,
  Language
} from "@/lib/anthropic/types";

export type QueryRow = {
  id: string;
  user_id: string;
  raw_text: string;
  classification: Classification | null;
  urgency: Urgency | null;
  language: Language | null;
  confidence: number | null;
  transcript_url: string | null;
  summary: string | null;
  prep_pdf_url: string | null;
  status: "pending" | "classified" | "prepped" | "failed";
  created_at: string;
};

export async function getCurrentUserId(): Promise<string | null> {
  const supa = getSupabaseServerClient();
  if (!supa) return null;
  const {
    data: { user }
  } = await supa.auth.getUser();
  return user?.id ?? null;
}

export async function insertClassifiedQuery(args: {
  userId: string;
  rawText: string;
  result: TriageClassification;
  transcriptUrl?: string | null;
}): Promise<QueryRow | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;

  const { data, error } = await supa
    .from("queries")
    .insert({
      user_id: args.userId,
      raw_text: args.rawText,
      classification: args.result.classification,
      urgency: args.result.urgency,
      language: args.result.language,
      confidence: args.result.confidence,
      transcript_url: args.transcriptUrl ?? null,
      status: "classified"
    })
    .select("*")
    .single();

  if (error) {
    console.error("[triage] insertClassifiedQuery", error);
    return null;
  }
  return data as QueryRow;
}

export async function getQueryForUser(args: {
  userId: string;
  queryId: string;
}): Promise<QueryRow | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;

  const { data, error } = await supa
    .from("queries")
    .select("*")
    .eq("id", args.queryId)
    .eq("user_id", args.userId)
    .maybeSingle();

  if (error) {
    console.error("[triage] getQueryForUser", error);
    return null;
  }
  return (data as QueryRow) ?? null;
}

export async function updateQueryWithPrep(args: {
  queryId: string;
  prep: CasePrep;
  prepPdfUrl: string | null;
}): Promise<void> {
  const supa = getSupabaseServiceClient();
  if (!supa) return;

  const { error } = await supa
    .from("queries")
    .update({
      summary: args.prep.summary,
      urgency: args.prep.urgency,
      language: args.prep.language,
      prep_pdf_url: args.prepPdfUrl,
      status: "prepped",
      updated_at: new Date().toISOString()
    })
    .eq("id", args.queryId);

  if (error) console.error("[triage] updateQueryWithPrep", error);
}

export async function markQueryFailed(queryId: string, reason: string): Promise<void> {
  const supa = getSupabaseServiceClient();
  if (!supa) return;
  await supa
    .from("queries")
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("id", queryId);
  console.error("[triage] query failed", { queryId, reason });
}
