import { notFound } from "next/navigation";
import { getSkuMeta, listSkus, LAWYER_REVIEW_ADDON_PAISE } from "@/lib/skus";
import { getFormSpec } from "@/lib/forms";
import { DocumentForm } from "@/components/documents/document-form";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export function generateStaticParams() {
  return listSkus().map((s) => ({ sku: s.id }));
}

export const dynamic = "force-dynamic";

// Document SKU pages are intentionally PUBLIC — anyone can fill the
// form, preview the rendered draft, and download the free PDF/DOCX
// without signing up. Auth is required only for "save to inbox",
// paid lawyer review, and any consultation booking.
export default async function DocumentSkuPage({
  params
}: {
  params: { sku: string };
}) {
  const meta = getSkuMeta(params.sku);
  const spec = getFormSpec(params.sku);
  if (!meta || !spec) notFound();

  const supa = getSupabaseServerClient();
  const mockMode = !supa;
  let signedIn = false;
  if (supa) {
    const {
      data: { user }
    } = await supa.auth.getUser();
    signedIn = Boolean(user);
  }

  const totalIfAddon = meta.price_paise + LAWYER_REVIEW_ADDON_PAISE;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          Document automation · {meta.category}
        </p>
        <h1 className="text-2xl font-semibold">{meta.title}</h1>
        <p className="text-sm text-neutral-600">{meta.short_description}</p>
        <p className="text-sm font-medium">
          {fmt(meta.price_paise)}
          {meta.allow_addon_lawyer_review ? (
            <span className="text-neutral-500"> · {fmt(totalIfAddon)} with lawyer review</span>
          ) : null}
        </p>
      </header>

      {!signedIn ? (
        <p className="rounded-md border border-ink-100 bg-ink-50 p-3 text-xs text-ink-700">
          Free to use — no sign-up needed. Fill the form, preview the
          draft, download the PDF/DOCX. Sign in only when you want to
          save it, share it, or add lawyer review.
        </p>
      ) : null}
      {mockMode ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          Running in mock mode.
        </p>
      ) : null}

      <DocumentForm
        sku={{
          id: meta.id,
          title: meta.title,
          short_description: meta.short_description,
          price_paise: meta.price_paise,
          allow_addon_lawyer_review: meta.allow_addon_lawyer_review
        }}
        spec={spec}
        razorpayConfigured={Boolean(process.env.RAZORPAY_KEY_ID)}
        upiConfigured={Boolean(process.env.UPI_VPA && process.env.UPI_MERCHANT_NAME)}
        siteUrl={process.env.NEXT_PUBLIC_SITE_URL}
      />
    </main>
  );
}

function fmt(paise: number): string {
  return (paise / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  });
}
