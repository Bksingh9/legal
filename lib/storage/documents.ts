import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const DOCUMENTS_BUCKET = "documents";

export async function uploadDocumentArtefacts(args: {
  userId: string;
  documentId: string;
  pdf: Buffer;
  docx: Buffer;
}): Promise<{ pdfUrl: string | null; docxUrl: string | null }> {
  const supa = getSupabaseServiceClient();
  if (!supa) return { pdfUrl: null, docxUrl: null };

  const pdfPath = `${args.userId}/${args.documentId}.pdf`;
  const docxPath = `${args.userId}/${args.documentId}.docx`;

  const [pdfRes, docxRes] = await Promise.all([
    supa.storage.from(DOCUMENTS_BUCKET).upload(pdfPath, args.pdf, {
      contentType: "application/pdf",
      upsert: true,
      cacheControl: "private, max-age=0"
    }),
    supa.storage.from(DOCUMENTS_BUCKET).upload(docxPath, args.docx, {
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: true,
      cacheControl: "private, max-age=0"
    })
  ]);

  if (pdfRes.error) console.error("[storage/documents] pdf upload", pdfRes.error);
  if (docxRes.error) console.error("[storage/documents] docx upload", docxRes.error);

  const seven = 60 * 60 * 24 * 7;
  const [signedPdf, signedDocx] = await Promise.all([
    supa.storage.from(DOCUMENTS_BUCKET).createSignedUrl(pdfPath, seven),
    supa.storage.from(DOCUMENTS_BUCKET).createSignedUrl(docxPath, seven)
  ]);

  return {
    pdfUrl: signedPdf.data?.signedUrl ?? null,
    docxUrl: signedDocx.data?.signedUrl ?? null
  };
}
