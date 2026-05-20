import { LeadCapture } from "@/components/consult/lead-capture";
import { PageHeader } from "@/components/landing/page-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { ShieldCheck, PhoneCall, Globe2 } from "lucide-react";

export const metadata = {
  title: "Talk to a lawyer in 10 minutes — LegalDesk AI",
  description:
    "Describe your legal issue in one line. A verified Indian advocate will call you back in 10 minutes. First call free."
};

export default function TalkToLawyerPage() {
  return (
    <main>
      <PageHeader
        eyebrow="Talk to a lawyer"
        title="A verified advocate calls you back in 10 minutes."
        description="Tell us your situation in one line. We'll match by specialization, language, and state. First 15-minute call is free."
      />

      <section className="bg-white py-16 md:py-20">
        <div className="container max-w-5xl">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm md:p-8">
              <LeadCapture />
            </div>
            <aside className="flex flex-col gap-6">
              <SidebarCard
                icon={PhoneCall}
                title="What you get"
                items={[
                  "Verified advocate, matched by issue + state + language",
                  "Browser call — no app to download",
                  "15-minute first consult is free",
                  "Follow-up: ₹199 (15m), ₹349 (30m), ₹599 (60m)"
                ]}
              />
              <SidebarCard
                icon={ShieldCheck}
                title="Compliance"
                items={[
                  "BCI Rule 36 — no advocate advertising on this site",
                  "DPDP Act 2023 — data stored in India (Mumbai)",
                  "Calls recorded only with both parties' consent"
                ]}
              />
              <SidebarCard
                icon={Globe2}
                title="Prefer self-serve?"
                items={[
                  "Run free AI triage — instant case prep",
                  "Generate a legal document — free download"
                ]}
                links={[
                  { href: "/triage", label: "Run free AI triage" },
                  { href: "/documents", label: "Generate a document" }
                ]}
              />
            </aside>
          </div>

          <p className="mt-12 text-center text-xs text-ink-400">
            Generated outputs and matched-advocate consultations are not legal
            advice. The platform is a technology intermediary connecting users
            with independently practicing advocates.
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function SidebarCard({
  icon: Icon,
  title,
  items,
  links
}: {
  icon: typeof PhoneCall;
  title: string;
  items: string[];
  links?: Array<{ href: string; label: string }>;
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-ink-50/60 p-6">
      <div className="flex items-center gap-2">
        <Icon size={18} className="text-brand-600" />
        <p className="font-medium text-ink-900">{title}</p>
      </div>
      <ul className="mt-3 space-y-2 text-sm text-ink-700">
        {items.map((it) => (
          <li key={it} className="flex gap-2">
            <span className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-brand-500" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
      {links ? (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-brand-700 underline-offset-4 hover:underline">
              {l.label} →
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
