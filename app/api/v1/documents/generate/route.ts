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

const Body = z.object({
  sku: z.string().min(1).max(64),
  input: z.record(z.unknown())
});

// Tier 5 B2B: generate one document programmatically. Authenticated by an org
// API key (Authorization: Bearer ldk_live_... or x-api-key). Counts one
// document against the org's monthly quota.
export async function POST(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) {
    const status = auth.error === "org_suspended" ? 403 : 401;
    return NextResponse.json({ error: auth.error }, { status });
  }
  const { authed } = auth;
  if (!hasScope(authed, "documents:generate")) {
    return NextResponse.json({ error: "scope documents:generate required" }, { status: 403 });
  }

  const limited = await rateLimitByKey({ key: `org:${authed.org.id}:v1-generate`, max: 120 });
  if (!limited.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const meta = getSkuMeta(parsed.sku);
  if (!meta) return NextResponse.json({ error: "Unknown SKU." }, { status: 404 });

  const valid = meta.schema.safeParse(parsed.input);
  if (!valid.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: valid.error.format() },
      { status: 422 }
    );
  }

  const quota = await consumeQuota(authed.org, 1);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: "monthly_quota_exceeded", doc_count: quota.doc_count, monthly_quota: quota.monthly_quota },
      { status: 402 }
    );
  }

  const documentId = randomUUID();
  try {
    const rendered = renderForSku(parsed.sku, valid.data, {
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
    return NextResponse.json({
      ok: true,
      document_id: documentId,
      sku: parsed.sku,
      pdf_url: uploaded.pdfUrl,
      docx_url: uploaded.docxUrl,
      usage: { doc_count: quota.doc_count, monthly_quota: quota.monthly_quota }
    });
  } catch (err) {
    console.error("[v1/documents/generate] render failed", err);
    return NextResponse.json({ error: "Render failed." }, { status: 500 });
  }
}
