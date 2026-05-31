import { NextResponse } from "next/server";
import { renderForSku } from "@/lib/templates";
import { getSkuMeta } from "@/lib/skus";
import { renderDocumentPdf } from "@/lib/pdf/document-render";
import { renderDocumentDocx } from "@/lib/docx/document-render";
import { rateLimitOrReject } from "@/lib/rate-limit/check";

export const runtime = "nodejs";

// Tier-0 free download: validates the form input with the SKU schema,
// renders the deterministic template, and streams the result as a PDF
// or DOCX attachment. No DB write, no payment, no email gate.
//
// The Razorpay path remains available when keys are wired; that gives
// the user delivery (email + WhatsApp) and unlocks the lawyer-review
// add-on. The download here is the floor of the contract — users always
// get their document.
export async function POST(req: Request, props: { params: Promise<{ sku: string }> }) {
  const params = await props.params;
  const limited = await rateLimitOrReject(req, { bucket: "doc-download", max: 30 });
  if (limited) return limited;

  const meta = getSkuMeta(params.sku);
  if (!meta) {
    return NextResponse.json({ error: "Unknown SKU." }, { status: 404 });
  }

  // Public free download — anyone can render and download the draft.
  // Persistence happens elsewhere when authenticated.

  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "pdf";
  if (format !== "pdf" && format !== "docx") {
    return NextResponse.json(
      { error: "format must be pdf or docx." },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = meta.schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.format() },
      { status: 400 }
    );
  }

  const doc = renderForSku(params.sku, parsed.data, {
    reference: `free-${Date.now().toString(36)}`,
    generated_at: new Date().toISOString()
  });

  const filename = `${params.sku}-${Date.now()}.${format}`;
  try {
    const buf =
      format === "pdf"
        ? await renderDocumentPdf(doc)
        : await renderDocumentDocx(doc);
    return new NextResponse(buf as unknown as BodyInit, {
      status: 200,
      headers: {
        "content-type":
          format === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store"
      }
    });
  } catch (err) {
    console.error("[documents/download] render failed", err);
    return NextResponse.json({ error: "Render failed." }, { status: 500 });
  }
}
