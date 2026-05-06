import { NextResponse } from "next/server";
import { renderForSku } from "@/lib/templates";
import { getSkuMeta } from "@/lib/skus";
import { getCurrentUserId } from "@/lib/triage/persistence";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: { sku: string } }
) {
  const sku = params.sku;
  const meta = getSkuMeta(sku);
  if (!meta) return NextResponse.json({ error: "Unknown SKU." }, { status: 404 });

  const userId = await getCurrentUserId();
  if (!userId && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "Sign in." }, { status: 401 });
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
