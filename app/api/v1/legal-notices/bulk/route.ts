import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getSkuMeta } from "@/lib/skus";
import { renderForSku } from "@/lib/templates";
import { renderDocumentPdf } from "@/lib/pdf/document-render";
import { renderDocumentDocx } from "@/lib/docx/document-render";
import { uploadDocumentArtefacts } from "@/lib/storage/documents";
import { rateLimitByKey } from "@/lib/rate-limit/check";
import { authenticateApiKey, hasScope, consumeQuota } from "@/lib/orgs/persistence";

export const runtime = "nodejs";

const BULK_SKU = "legal-notice";
const MAX_ITEMS = 100;

const Body = z.object({
  items: z.array(z.record(z.unknown())).min(1).max(MAX_ITEMS)
});

interface ItemResult {
  index: number;
  ok: boolean;
  document_id?: string;
  pdf_url?: string | null;
  docx_url?: string | null;
  error?: string;
}

// Tier 5 B2B: bulk legal-notice issuance for collections. One quota unit per
// VALID item; invalid rows are reported but not charged. Each notice is
// rendered and stored; the response carries a signed URL per row so the caller
// can fan out delivery (email/WhatsApp) on their side.
export async function POST(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) {
    const status = auth.error === "org_suspended" ? 403 : 401;
    return NextResponse.json({ error: auth.error }, { status });
  }
  const { authed } = auth;
  if (!hasScope(authed, "notices:bulk")) {
    return NextResponse.json({ error: "scope notices:bulk required" }, { status: 403 });
  }

  const limited = await rateLimitByKey({ key: `org:${authed.org.id}:v1-bulk`, max: 30 });
  if (!limited.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: `Invalid input. Provide { items: [...] }, max ${MAX_ITEMS}.` }, { status: 400 });
  }

  const meta = getSkuMeta(BULK_SKU);
  if (!meta) return NextResponse.json({ error: "Bulk SKU unavailable." }, { status: 500 });

  // Validate first so we charge quota only for issuable notices.
  const validated = parsed.items.map((raw) => meta.schema.safeParse(raw));
  const validCount = validated.filter((v) => v.success).length;
  if (validCount === 0) {
    return NextResponse.json({ error: "No valid items." }, { status: 422 });
  }

  const quota = await consumeQuota(authed.org, validCount);
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: "monthly_quota_exceeded",
        requested: validCount,
        doc_count: quota.doc_count,
        monthly_quota: quota.monthly_quota
      },
      { status: 402 }
    );
  }

  const results: ItemResult[] = await Promise.all(
    validated.map(async (v, index): Promise<ItemResult> => {
      if (!v.success) return { index, ok: false, error: "validation_failed" };
      const documentId = randomUUID();
      try {
        const rendered = renderForSku(BULK_SKU, v.data, {
          reference: documentId,
          generated_at: new Date().toISOString()
        });
        const [pdf, docx] = await Promise.all([
          renderDocumentPdf(rendered),
          renderDocumentDocx(rendered)
        ]);
        const uploaded = await uploadDocumentArtefacts({
          userId: `org_${authed.org.id}`,
          documentId,
          pdf,
          docx
        });
        return {
          index,
          ok: true,
          document_id: documentId,
          pdf_url: uploaded.pdfUrl,
          docx_url: uploaded.docxUrl
        };
      } catch (err) {
        console.error("[v1/legal-notices/bulk] render failed", index, err);
        return { index, ok: false, error: "render_failed" };
      }
    })
  );

  return NextResponse.json({
    ok: true,
    sku: BULK_SKU,
    count: results.filter((r) => r.ok).length,
    results,
    usage: { doc_count: quota.doc_count, monthly_quota: quota.monthly_quota }
  });
}
