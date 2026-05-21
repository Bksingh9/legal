import { PageHeader } from "@/components/landing/page-header";
import { SiteFooter } from "@/components/landing/site-footer";

export const metadata = {
  title: "About — LegalDesk AI",
  description:
    "Who LegalDesk AI is, where the company is registered, and how to contact us."
};

const compliance = [
  {
    name: "Bar Council of India · Rule 36",
    body: "We do not advertise individual advocates. No names, photos, or testimonials are displayed publicly."
  },
  {
    name: "Digital Personal Data Protection Act · 2023",
    body: "All personal data stored in India (Mumbai). Explicit consent at point of collection. Right to access, correct, and erase available from /account.",
    link: { href: "/account", label: "/account" }
  },
  {
    name: "IT Act 2000 + Intermediary Guidelines · 2021",
    body: "Grievance Officer published at /grievance.",
    link: { href: "/grievance", label: "/grievance" }
  },
  {
    name: "Consumer Protection Act · 2019",
    body: "Refund and cancellation policy.",
    link: { href: "/refunds-cancellation", label: "/refunds-cancellation" }
  }
];

const registered = [
  { k: "Legal entity", v: "[Name to be incorporated]" },
  { k: "Registered office", v: "[Address to be updated]" },
  { k: "CIN", v: "[Pending]" },
  { k: "GSTIN", v: "[Pending]" }
];

const contacts = [
  { label: "General", email: "hello@legaldesk.ai" },
  { label: "Grievance", email: "grievance@legaldesk.ai", note: "see /grievance", noteHref: "/grievance" },
  { label: "DPDP requests", email: "dpo@legaldesk.ai" },
  { label: "Disputes / refunds", email: "disputes@legaldesk.ai" },
  { label: "For advocates", email: "lawyers@legaldesk.ai", note: "or apply at /lawyer/apply", noteHref: "/lawyer/apply" }
];

export default function AboutPage() {
  return (
    <main>
      <PageHeader
        eyebrow="About"
        title="An Indian legal-technology platform."
        description="We combine AI-generated triage and document automation with intake and routing for consultations with independently practicing advocates. We are not a law firm. We do not represent clients. We do not provide legal advice."
      />

      <section className="bg-white py-16 md:py-20">
        <div className="container max-w-3xl space-y-16">
          <Block title="Compliance framework">
            <ul className="space-y-5">
              {compliance.map((c) => (
                <li key={c.name} className="rounded-2xl border border-ink-100 bg-ink-50/60 p-5">
                  <p className="text-sm font-medium text-ink-900">{c.name}</p>
                  <p className="mt-2 text-sm text-ink-700">
                    {c.body}
                    {c.link ? (
                      <>
                        {" "}
                        <a
                          href={c.link.href}
                          className="text-brand-700 underline underline-offset-4"
                        >
                          {c.link.label}
                        </a>
                      </>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          </Block>

          <Block title="Registered details">
            <p className="text-sm text-ink-700">
              The following are placeholders until the entity is incorporated.
              Once formal incorporation completes, this page reflects the actual
              registration on file.
            </p>
            <dl className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-ink-100 bg-ink-100">
              {registered.map((r) => (
                <div
                  key={r.k}
                  className="flex flex-col gap-1 bg-white p-4 md:flex-row md:items-baseline md:justify-between"
                >
                  <dt className="text-xs uppercase tracking-wider text-ink-400">{r.k}</dt>
                  <dd className="text-sm text-ink-900">{r.v}</dd>
                </div>
              ))}
              <div className="flex flex-col gap-1 bg-white p-4 md:flex-row md:items-baseline md:justify-between">
                <dt className="text-xs uppercase tracking-wider text-ink-400">Email</dt>
                <dd className="text-sm">
                  <a
                    className="text-brand-700 underline underline-offset-4"
                    href="mailto:hello@legaldesk.ai"
                  >
                    hello@legaldesk.ai
                  </a>
                </dd>
              </div>
            </dl>
          </Block>

          <Block title="Contact channels">
            <ul className="space-y-3">
              {contacts.map((c) => (
                <li
                  key={c.email}
                  className="flex flex-col gap-1 rounded-xl bg-ink-50/60 p-4 md:flex-row md:items-baseline md:justify-between"
                >
                  <span className="text-sm font-medium text-ink-900">{c.label}</span>
                  <span className="text-sm">
                    <a
                      className="text-brand-700 underline underline-offset-4"
                      href={`mailto:${c.email}`}
                    >
                      {c.email}
                    </a>
                    {c.note ? (
                      <span className="ml-2 text-ink-400">
                        ·{" "}
                        {c.noteHref ? (
                          <a className="underline underline-offset-4" href={c.noteHref}>
                            {c.note}
                          </a>
                        ) : (
                          c.note
                        )}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </Block>

          <p className="text-xs text-ink-400">Last updated: 21 May 2026</p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-serif text-3xl text-ink-900 md:text-4xl">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}
