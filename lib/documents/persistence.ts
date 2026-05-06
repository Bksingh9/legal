import { getSupabaseServiceClient } from "@/lib/supabase/server";

export type DocumentStatus =
  | "draft"
  | "generated"
  | "paid"
  | "delivered"
  | "reviewed";

export interface DocumentRow {
  id: string;
  user_id: string;
  type: string; // legacy text column from migration 0001
  sku: string | null;
  status: DocumentStatus;
  input_json: Record<string, unknown>;
  output_pdf_url: string | null;
  output_docx_url: string | null;
  paid: boolean;
  price_paise: number;
  addon_lawyer_review: boolean;
  language: string | null;
  payment_id: string | null;
  lawyer_review_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function createDraftDocument(args: {
  userId: string;
  sku: string;
  price_paise: number;
  language: string;
  input: Record<string, unknown>;
  addon_lawyer_review: boolean;
}): Promise<DocumentRow | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;
  const { data, error } = await supa
    .from("documents")
    .insert({
      user_id: args.userId,
      type: args.sku,
      sku: args.sku,
      status: "draft",
      input_json: args.input,
      price_paise: args.price_paise,
      addon_lawyer_review: args.addon_lawyer_review,
      language: args.language
    })
    .select("*")
    .single();
  if (error) {
    console.error("[documents] createDraftDocument", error);
    return null;
  }
  return data as DocumentRow;
}

export async function getDocumentForUser(args: {
  userId: string;
  documentId: string;
}): Promise<DocumentRow | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;
  const { data, error } = await supa
    .from("documents")
    .select("*")
    .eq("id", args.documentId)
    .eq("user_id", args.userId)
    .maybeSingle();
  if (error) {
    console.error("[documents] getDocumentForUser", error);
    return null;
  }
  return (data as DocumentRow) ?? null;
}

export async function getDocumentById(documentId: string): Promise<DocumentRow | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;
  const { data, error } = await supa
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle();
  if (error) {
    console.error("[documents] getDocumentById", error);
    return null;
  }
  return (data as DocumentRow) ?? null;
}

export async function updateDocumentDelivered(args: {
  documentId: string;
  pdfUrl: string | null;
  docxUrl: string | null;
  lawyerReviewId: string | null;
}): Promise<void> {
  const supa = getSupabaseServiceClient();
  if (!supa) return;
  const { error } = await supa
    .from("documents")
    .update({
      output_pdf_url: args.pdfUrl,
      output_docx_url: args.docxUrl,
      paid: true,
      status: args.lawyerReviewId ? "paid" : "delivered",
      lawyer_review_id: args.lawyerReviewId,
      updated_at: new Date().toISOString()
    })
    .eq("id", args.documentId);
  if (error) console.error("[documents] updateDocumentDelivered", error);
}
