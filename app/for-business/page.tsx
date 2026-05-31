import Link from "next/link";
import { ArrowRight, Building2, Code2, FileStack, ShieldCheck, Mail } from "lucide-react";
import { PageHeader } from "@/components/landing/page-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { Reveal } from "@/components/ui/motion";
import { ORG_PLANS, type OrgPlan } from "@/lib/orgs/plans";

export const metadata = {
  title: "For business — LegalDesk AI",
  description:
    "Public API for legal document automation in India. Generate notices, complaints, and agreements at scale; bulk legal-notice issuance for collections. BCI Rule 36 + DPDP Act 2023 compliant by construction."
};

const valueProps = [
  {
    icon: Code2,
    title: "Public API, scope-gated keys",
    body: "POST /api/v1/documents/generate to render any of our 7 SKUs as PDF + DOCX. Per-org Bearer keys with documents:generate / notices:bulk scopes, sha256-hashed at rest, instantly revocable."
  },
  {
    icon: FileStack,
    title: "Bulk legal-notice issuance",
    body: "POST /api/v1/legal-notices/bulk with up to 100 rows; we render each notice and return a signed URL per item. Quota is only consumed for valid rows. Built for collections, recoveries, lessor enforcement."
  },
  {
    icon: ShieldCheck,
    title: "BCI + DPDP compliant by construction",
    body: "No public lawyer profiles, no advertising. Data residency in ap-south-1, consent at point of collection, right-to-export + right-to-erase wired to /api/dpdp/*. Audit-grade by default."
  },
  {
    icon: Building2,
    title: "Dedicated lawyer pool",
    body: "Optional add-on: route generated documents to a verified advocate panel for review before issuance. UPI payouts to the reviewer, 24h hold, fully Indian rails."
  }
];

const PLAN_FEATURES: Record<OrgPlan, string[]> = {
  starter: [
    "100 documents / month",
    "All 7 SKUs + bulk notices",
    "Email + chat support",
    "1 API key, 1 scope at a time"
  ],
  growth: [
    "500 documents / month",
    "All 7 SKUs + bulk notices",
    "Priority support (4-hour SLA)",
    "Unlimited keys, multi-scope",
    "Razorpay Route splits for marketplaces"
  ],
  scale: [
    "Unlimited documents / month",
    "Dedicated lawyer pool",
    "Named CSM + 1-hour SLA",
    "Custom SKUs on request",
    "Per-org rate limit tuning"
  ]
};

const PLAN_ORDER: OrgPlan[] = ["starter", "growth", "scale"];

const steps = [
  "Email b2b@legaldesk.ai with your use case + expected monthly volume.",
  "We provision an org and issue a Bearer API key for /api/v1 (shown once).",
  "Integrate against the OpenAPI spec at /api/docs.",
  "Per-call billing reflected against your monthly quota; usage visible to admins."
];

function formatRupees(paise: number): string {
  const inr = paise / 100;
  return inr >= 1000 ? `INR ${inr.toLocaleString("en-IN")}` : `INR ${inr}`;
}

export default function ForBusinessPage() {
  return (
    <main>
      <PageHeader
        eyebrow="For business"
        title="Build Indian legal automation into your product."
        description="A public API for the same document, lawyer, and compliance rails LegalDesk runs on. Built for HR teams, real-estate brokers, lenders, and fintechs that need legal output at scale."
      />

      <section className="bg-white py-16 md:py-20">
        <div className="container max-w-5xl">
          <div className="grid gap-5 md:grid-cols-2">
            {valueProps.map((v, i) => (
              <Reveal
                key={v.title}
                delay={i * 0.05}
                className="rounded-2xl border border-ink-100 bg-white p-6 transition hover:border-ink-200 hover:shadow-lg"
              >
                <v.icon size={22} className="text-brand-600" />
                <h3 className="mt-4 text-lg font-medium text-ink-900">{v.title}</h3>
                <p className="mt-2 text-sm text-ink-700">{v.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink-50 py-16 md:py-20">
        <div className="container max-w-5xl">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Pricing</p>
            <h2 className="mt-3 font-serif text-3xl text-ink-900 md:text-4xl">
              Three plans, one API surface.
            </h2>
            <p className="mt-3 text-sm text-ink-700">
              Quota is per calendar month, enforced atomically server-side. All prices are GST-exclusive.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {PLAN_ORDER.map((id, idx) => {
              const plan = ORG_PLANS[id];
              const featured = id === "growth";
              return (
                <Reveal
                  key={id}
                  delay={idx * 0.05}
                  className={[
                    "flex flex-col rounded-2xl border bg-white p-6",
                    featured ? "border-brand-500 shadow-lg" : "border-ink-100"
                  ].join(" ")}
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-brand-600">{plan.title}</p>
                  <p className="mt-3 font-serif text-3xl text-ink-900">
                    {formatRupees(plan.price_paise)}
                    <span className="text-base font-normal text-ink-500">/mo</span>
                  </p>
                  <p className="mt-2 text-sm text-ink-700">
                    {plan.monthly_doc_quota === 0
                      ? "Unlimited documents"
                      : `${plan.monthly_doc_quota.toLocaleString("en-IN")} documents / month`}
                  </p>
                  <ul className="mt-5 flex-1 space-y-2 text-sm text-ink-700">
                    {PLAN_FEATURES[id].map((f) => (
                      <li key={f} className="flex gap-2">
                        <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={`mailto:b2b@legaldesk.ai?subject=${encodeURIComponent(plan.title + " plan inquiry")}`}
                    className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-night-900 px-5 text-sm font-medium text-white transition hover:bg-night-800"
                  >
                    Talk to sales
                    <ArrowRight size={16} />
                  </a>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="container max-w-5xl">
          <div className="grid gap-12 md:grid-cols-2">
            <Reveal>
              <p className="text-xs uppercase tracking-[0.2em] text-brand-600">How it works</p>
              <h2 className="mt-3 font-serif text-3xl text-ink-900 md:text-4xl">
                From email to first document in a day.
              </h2>
              <ol className="mt-8 space-y-5">
                {steps.map((s, i) => (
                  <li key={s} className="flex gap-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-night-900 text-xs font-medium text-white">
                      {i + 1}
                    </span>
                    <span className="pt-0.5 text-sm text-ink-700">{s}</span>
                  </li>
                ))}
              </ol>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Sample request</p>
              <h2 className="mt-3 font-serif text-3xl text-ink-900 md:text-4xl">
                One POST, one PDF.
              </h2>
              <pre className="mt-6 overflow-x-auto rounded-xl border border-ink-100 bg-ink-50 p-4 text-xs leading-relaxed text-ink-800">
{`POST /api/v1/documents/generate
Authorization: Bearer ldk_live_<key>
Content-Type: application/json

{
  "sku": "legal-notice",
  "input": { /* schema at /api/docs */ }
}

200 OK
{ "ok": true,
  "document_id": "...",
  "pdf_url":  "https://...signed...",
  "docx_url": "https://...signed...",
  "usage": { "doc_count": 1, "monthly_quota": 100 } }`}
              </pre>
              <p className="mt-3 text-xs text-ink-500">
                Full schema (incl. all 7 SKUs, bulk endpoint, error codes, rate-limits):{" "}
                <Link href="/api/docs" className="underline">/api/docs</Link>.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-ink-50 py-16 md:py-20">
        <div className="container max-w-3xl">
          <Reveal className="overflow-hidden rounded-2xl border border-night-900 bg-night-900 p-8 text-white md:p-12">
            <p className="text-xs uppercase tracking-[0.2em] text-accent-400">Get started</p>
            <h2 className="mt-3 font-serif text-3xl md:text-4xl">
              Talk to the team. Get a sandbox key in 24 hours.
            </h2>
            <p className="mt-4 max-w-xl text-night-100/80">
              Tell us your use case and expected monthly volume. We will reply with
              a sandbox org + scoped key the same day, and walk you through the
              first integration call within 48 hours.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="mailto:b2b@legaldesk.ai?subject=LegalDesk%20for%20Business%20inquiry"
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-base font-medium text-night-900 transition hover:bg-night-100"
              >
                Email b2b@legaldesk.ai
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </a>
              <Link
                href="/api/docs"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 px-7 text-base font-medium text-white transition hover:bg-white/10"
              >
                <Mail size={16} />
                Read the API spec
              </Link>
            </div>
          </Reveal>

          <p className="mt-10 text-center text-xs text-ink-400">
            LegalDesk AI is a technology intermediary. Generated documents are
            drafts; production use should be reviewed by a qualified advocate.
            We are not a law firm.
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
