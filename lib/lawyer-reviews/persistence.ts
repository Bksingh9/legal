import { getSupabaseServiceClient } from "@/lib/supabase/server";

export type LawyerReviewStatus = "pending" | "claimed" | "completed" | "cancelled";

export interface LawyerReviewRow {
  id: string;
  user_id: string;
  document_id: string;
  lawyer_id: string | null;
  status: LawyerReviewStatus;
  notes: string | null;
  created_at: string;
  claimed_at: string | null;
  completed_at: string | null;
}

export async function createLawyerReview(args: {
  userId: string;
  documentId: string;
}): Promise<LawyerReviewRow | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;
  const { data, error } = await supa
    .from("lawyer_reviews")
    .insert({
      user_id: args.userId,
      document_id: args.documentId,
      status: "pending"
    })
    .select("*")
    .single();
  if (error) {
    console.error("[lawyer-reviews] create", error);
    return null;
  }
  return data as LawyerReviewRow;
}
