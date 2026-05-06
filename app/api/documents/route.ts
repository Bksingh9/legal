import { NextResponse } from "next/server";
import { z } from "zod";
import { getSkuMeta } from "@/lib/skus";
import { getCurrentUserId } from "@/lib/triage/persistence";
import { createDraftDocument } from "@/lib/documents/persistence";

export const runtime = "nodejs";

const Body = z.object({
  sku: z.string().min(1).max(64),
  input: z.record(z.unknown()),
  addon_lawyer_review: z.boolean().default(false)
});

export async function POST(req: Request) {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const meta = getSkuMeta(parsed.sku);
  if (!meta) return NextResponse.json({ error: "Unknown SKU." }, { status: 404 });

  if (parsed.addon_lawyer_review && !meta.allow_addon_lawyer_review) {
    return NextResponse.json(
      { error: "Lawyer review is not available for this SKU." },
      { status: 400 }
    );
  }

  const inputCheck = meta.schema.safeParse(parsed.input);
  if (!inputCheck.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: inputCheck.error.format() },
      { status: 400 }
    );
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: "Sign in." }, { status: 401 });
    }
    // Mock mode: no Supabase configured. Return a fake draft id so the
    // checkout flow can be walked locally.
    return NextResponse.json({
      ok: true,
      persisted: false,
      document_id: `doc_mock_${Date.now()}`,
      sku: parsed.sku,
      price_paise: meta.price_paise,
      addon_lawyer_review: parsed.addon_lawyer_review
    });
  }

  const inputData = inputCheck.data as { language?: "en" | "hi" };
  const draft = await createDraftDocument({
    userId,
    sku: parsed.sku,
    price_paise: meta.price_paise,
    language: inputData.language ?? "en",
    input: inputCheck.data as Record<string, unknown>,
    addon_lawyer_review: parsed.addon_lawyer_review
  });

  if (!draft) return NextResponse.json({ error: "Could not save draft." }, { status: 500 });

  return NextResponse.json({
    ok: true,
    persisted: true,
    document_id: draft.id,
    sku: draft.sku,
    price_paise: draft.price_paise,
    addon_lawyer_review: draft.addon_lawyer_review
  });
}
