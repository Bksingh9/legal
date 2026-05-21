import Link from "next/link";
import { FileText, ScrollText, ShieldAlert, Send, ArrowRight } from "lucide-react";
import { listSkus, type SkuMeta } from "@/lib/skus";
import { PageHeader } from "@/components/landing/page-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { Reveal } from "@/components/ui/motion";

export const metadata = {
  title: "Legal documents — LegalDesk AI",
  description:
    "Generate India-compliant legal documents in plain language: legal notices, replies, rent agreements, consumer complaints, RTI applications."
};

const categoryStyle: Record<SkuMeta["category"], { icon: typeof FileText; label: string }> = {
  notice: { icon: Send, label: "Notice" },
  agreement: { icon: ScrollText, label: "Agreement" },
  complaint: { icon: ShieldAlert, label: "Complaint" },
  application: { icon: FileText, label: "Application" }
};

function fmt(paise: number) {
  return (paise / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  });
}

export default function DocumentsIndex() {
  const skus = listSkus();
  return (
    <main>
      <PageHeader
        eyebrow="Documents"
        title="Court-ready drafts in minutes."
        description="Pick a document type. Fill a guided form. Pay. Receive PDF and DOCX on email and WhatsApp. Add lawyer review for ₹499 if you want a human signoff."
      />

      <section className="bg-white py-16 md:py-20">
        <div className="container max-w-4xl">
          <ul className="grid gap-4 md:grid-cols-2">
            {skus.map((s, i) => {
              const c = categoryStyle[s.category];
              return (
                <Reveal as="li" key={s.id} delay={i * 0.04}>
                  <Link
                    href={`/documents/${s.id}`}
                    className="group flex h-full flex-col gap-4 rounded-2xl border border-ink-100 bg-white p-6 transition hover:border-ink-200 hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-2 rounded-full bg-ink-50 px-3 py-1 text-xs uppercase tracking-wider text-ink-700">
                        <c.icon size={13} className="text-brand-600" />
                        {c.label}
                      </div>
                      <span className="font-serif text-xl tabular-nums text-ink-900">
                        {fmt(s.price_paise)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-medium text-ink-900">{s.title}</p>
                      <p className="mt-2 text-sm text-ink-700">{s.short_description}</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700">
                      Open the form
                      <ArrowRight
                        size={14}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </ul>

          <p className="mt-10 text-center text-xs text-ink-400">
            Want a custom document not listed here? Email{" "}
            <a
              href="mailto:hello@legaldesk.ai"
              className="text-brand-700 underline underline-offset-4"
            >
              hello@legaldesk.ai
            </a>{" "}
            — we add new SKUs each month based on demand.
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
