import { NextResponse } from "next/server";
import { renderForSku } from "@/lib/templates";
import { getSkuMeta } from "@/lib/skus";

export const runtime = "nodejs";

// Public: preview is part of the free-trial conversion path. No auth.
export async function POST(req: Request, props: { params: Promise<{ sku: string }> }) {
  const params = await props.params;
  const sku = params.sku;
  const meta = getSkuMeta(sku);
  if (!meta) return NextResponse.json({ error: "Unknown SKU." }, { status: 404 });

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

  try {
    const doc = renderForSku(sku, parsed.data, {
      reference: "preview",
      generated_at: new Date().toISOString()
    });
    return NextResponse.json({
      ok: true,
      sku,
      price_paise: meta.price_paise,
      currency: meta.currency,
      document: doc
    });
  } catch (err) {
    console.error("[documents/preview] render failed", err);
    return NextResponse.json({ error: "Render failed." }, { status: 500 });
  }
}
