import { NextResponse } from "next/server";
import { renderForSku } from "@/lib/templates";
import { getSkuMeta } from "@/lib/skus";
import { getCurrentUserId } from "@/lib/triage/persistence";
import { renderDocumentPdf } from "@/lib/pdf/document-render";
import { renderDocumentDocx } from "@/lib/docx/document-render";

export const runtime = "nodejs";

// Tier-0 free download: validates the form input with the SKU schema,
// renders the deterministic template, and streams the result as a PDF
// or DOCX attachment. No DB write, no payment, no email gate.
//
// The Razorpay path remains available when keys are wired; that gives
// the user delivery (email + WhatsApp) and unlocks the lawyer-review
// add-on. The download here is the floor of the contract — users always
// get their document.
export async function POST(
  req: Request,
  { params }: { params: { sku: string } }
) {
  const meta = getSkuMeta(params.sku);
  if (!meta) {
    return NextResponse.json({ error: "Unknown SKU." }, { status: 404 });
  }

  const userId = await getCurrentUserId();
  if (!userId && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "Sign in." }, { status: 401 });
  }

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
