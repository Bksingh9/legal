import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type { Specialization, LawyerLanguage } from "@/lib/lawyers/types";

export interface MatchInput {
  specialization: Specialization;
  language: LawyerLanguage;
  state: string;
  fanout?: number; // default 3 per spec §3 Tier 3
}

export interface MatchedLawyer {
  id: string;
  anon_slug: string;
  rating: number;
  open_consults: number;
}

// Filters active verified lawyers by intersection(specialization, language,
// state); ranks by current load (ascending) then rating (descending); picks
// the top N (default 3 per spec §3 Tier 3).
//
// The match runs through the service-role client so it can read the
// `lawyers` table beyond the RLS boundary, but it never returns name /
// email / phone / payout fields — only the anon_slug + rating + load. The
// caller is expected to fan out offers via WhatsApp + push using
// route_account_id and the lawyer's contact stored elsewhere.
export async function matchLawyers(input: MatchInput): Promise<MatchedLawyer[]> {
  const supa = getSupabaseServiceClient();
  const fanout = input.fanout ?? 3;
  if (!supa) return [];

  // contains-style filter on the array columns; the GIN indexes from
  // migration 0004 cover both.
  const { data, error } = await supa
    .from("lawyers")
    .select("id, anon_slug, rating, specializations, languages, state")
    .eq("status", "verified")
    .contains("specializations", [input.specialization])
    .contains("languages", [input.language])
    .eq("state", input.state)
    .limit(50);

  if (error) {
    console.error("[match/lawyers] query failed", error);
    return [];
  }
  const lawyers = (data ?? []) as Array<{
    id: string;
    anon_slug: string;
    rating: number;
  }>;
  if (lawyers.length === 0) return [];

  const counts = await openConsultCounts(lawyers.map((l) => l.id));

  return lawyers
    .map((l) => ({
      id: l.id,
      anon_slug: l.anon_slug,
      rating: l.rating,
      open_consults: counts[l.id] ?? 0
    }))
    .sort((a, b) => {
      if (a.open_consults !== b.open_consults) return a.open_consults - b.open_consults;
      return b.rating - a.rating;
    })
    .slice(0, fanout);
}

async function openConsultCounts(lawyerIds: string[]): Promise<Record<string, number>> {
  const supa = getSupabaseServiceClient();
  if (!supa || lawyerIds.length === 0) return {};
  const { data, error } = await supa
    .from("consultations")
    .select("lawyer_id, status")
    .in("lawyer_id", lawyerIds)
    .in("status", ["matched", "scheduled", "in_progress"]);
  if (error) {
    console.error("[match/lawyers] counts failed", error);
    return {};
  }
  const out: Record<string, number> = {};
  for (const row of (data as Array<{ lawyer_id: string }>) ?? []) {
    out[row.lawyer_id] = (out[row.lawyer_id] ?? 0) + 1;
  }
  return out;
}
