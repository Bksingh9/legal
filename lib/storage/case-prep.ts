import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const CASE_PREP_BUCKET = "case-prep";

export async function uploadCasePrepPdf(args: {
  userId: string;
  queryId: string;
  pdf: Buffer;
}): Promise<string | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;

  const path = `${args.userId}/${args.queryId}.pdf`;
  const { error } = await supa.storage
    .from(CASE_PREP_BUCKET)
    .upload(path, args.pdf, {
      contentType: "application/pdf",
      upsert: true,
      cacheControl: "private, max-age=0"
    });

  if (error) {
    console.error("[storage/case-prep] upload failed", error);
    return null;
  }

  // Signed URL for download. Owner read is also enforced via the RLS
  // policy in migration 0002 for users with a session.
  const { data: signed, error: signError } = await supa.storage
    .from(CASE_PREP_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 days

  if (signError || !signed) {
    console.error("[storage/case-prep] sign failed", signError);
    return null;
  }
  return signed.signedUrl;
}
