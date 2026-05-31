import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck, Zap } from "lucide-react";
import { getSkuMeta, listSkus, LAWYER_REVIEW_ADDON_PAISE } from "@/lib/skus";
import { getFormSpec } from "@/lib/forms";
import { DocumentForm } from "@/components/documents/document-form";
import { PageHeader } from "@/components/landing/page-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export function generateStaticParams() {
  return listSkus().map((s) => ({ sku: s.id }));
}

export const dynamic = "force-dynamic";

// Document SKU pages are intentionally PUBLIC — anyone can fill the
// form, preview the rendered draft, and download the free PDF/DOCX
// without signing up. Auth is required only for "save to inbox",
// paid lawyer review, and any consultation booking.
export default async function DocumentSkuPage(
  props: {
    params: Promise<{ sku: string }>;
  }
) {
  const params = await props.params;
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
    <main>
      <PageHeader eyebrow={`Document · ${meta.category}`} title={meta.title} description={meta.short_description} />

      <section className="bg-white py-16 md:py-20">
        <div className="container max-w-3xl">
          <div className="mb-6 flex items-center justify-between gap-4">
            <Link
              href="/documents"
              className="inline-flex items-center gap-1.5 text-sm text-ink-700 transition-colors hover:text-ink-900"
            >
              <ArrowLeft size={14} />
              All documents
            </Link>
            <p className="text-sm font-medium text-ink-900">
              {fmt(meta.price_paise)}
              {meta.allow_addon_lawyer_review ? (
                <span className="ml-2 font-normal text-ink-400">
                  · {fmt(totalIfAddon)} with lawyer review
                </span>
              ) : null}
            </p>
          </div>

          {!signedIn ? (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-ink-100 bg-ink-50/60 p-4 text-sm text-ink-700">
              <Zap size={16} className="mt-0.5 shrink-0 text-accent-500" />
              <p>
                Free to use — no sign-up needed. Fill the form, preview the
                draft, download the PDF/DOCX. Sign in only when you want to
                save it, share it, or add lawyer review.
              </p>
            </div>
          ) : null}
          {mockMode ? (
            <div className="mb-6 rounded-xl border border-accent-200 bg-accent-50 p-3 text-xs text-ink-900">
              Running in mock mode.
            </div>
          ) : null}

          <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm md:p-8">
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
          </div>

          <div className="mt-10 flex items-start gap-3 rounded-xl bg-ink-50/60 p-4 text-sm text-ink-700">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-brand-600" />
            <p>
              Drafts are generated from your inputs and reviewed against the
              latest Indian statutes. They are not legal advice. The optional
              ₹499 lawyer-review add-on returns a 24-hour review and a stamped
              copy for court use.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
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
