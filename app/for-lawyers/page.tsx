import Link from "next/link";
import {
  ShieldCheck,
  Wallet,
  EyeOff,
  Workflow,
  ArrowRight,
  Mail
} from "lucide-react";
import { PageHeader } from "@/components/landing/page-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { Reveal } from "@/components/ui/motion";

export const metadata = {
  title: "For advocates — LegalDesk AI",
  description:
    "Join LegalDesk AI's verified advocate panel. AI-routed clients, no advertising risk, UPI payouts, BCI Rule 36 compliant by construction."
};

const valueProps = [
  {
    icon: Workflow,
    title: "Matched, not marketed",
    body: "Offers arrive in your dashboard based on specialization, language, state, and an anonymous internal rating. No client hunting."
  },
  {
    icon: EyeOff,
    title: "Anonymous on every public surface",
    body: "We never publish your name, photo, testimonials, or rank. BCI Rule 36 compliant by construction."
  },
  {
    icon: Wallet,
    title: "UPI payouts, 24h after the call",
    body: "55–65% of the consultation fee after platform fee + GST. Weekly settlement, fully Indian rails."
  },
  {
    icon: ShieldCheck,
    title: "You keep the client",
    body: "Once a relationship begins, you're free to take it off-platform. We earn on first contact, you earn on retention."
  }
];

const steps = [
  "Apply with your Bar Council ID, state, and specializations.",
  "We verify against the relevant state bar directory (24–48 h).",
  "Offers appear in your dashboard. Accept within 30 minutes when in window.",
  "Take the call on browser-native Jitsi — no SDK install.",
  "UPI payout to your VPA 24 hours after the call ends."
];

const asks = [
  "Minimum 5 hours/week of stated availability",
  "Accept or decline offers within 30 minutes when in window",
  "Two-party consent before any call recording",
  "Generated drafts must be reviewed before use in court"
];

export default function ForLawyersPage() {
  return (
    <main>
      <PageHeader
        eyebrow="For advocates"
        title="Get paying clients. Keep your name off our marketing."
        description="LegalDesk routes verified Indian legal queries to advocates by specialization, language, and state. You see only the offers that match your profile — and we never publish you."
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
          <div className="grid gap-12 md:grid-cols-2">
            <Reveal>
              <p className="text-xs uppercase tracking-[0.2em] text-brand-600">How it works</p>
              <h2 className="mt-3 font-serif text-3xl text-ink-900 md:text-4xl">
                From application to first payout.
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
              <p className="text-xs uppercase tracking-[0.2em] text-brand-600">What we ask</p>
              <h2 className="mt-3 font-serif text-3xl text-ink-900 md:text-4xl">
                Small, professional commitments.
              </h2>
              <ul className="mt-8 space-y-4 text-sm text-ink-700">
                {asks.map((a) => (
                  <li key={a} className="flex gap-3">
                    <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="container max-w-3xl">
          <Reveal className="overflow-hidden rounded-2xl border border-night-900 bg-night-900 p-8 text-white md:p-12">
            <p className="text-xs uppercase tracking-[0.2em] text-accent-400">Get started</p>
            <h2 className="mt-3 font-serif text-3xl md:text-4xl">
              Apply to the verified advocate panel.
            </h2>
            <p className="mt-4 max-w-xl text-night-100/80">
              Takes 5 minutes. You&apos;ll need your Bar Council ID and your UPI
              VPA for payouts. No account needed — we email a sign-in link after
              you submit.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/lawyer/apply"
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-base font-medium text-night-900 transition hover:bg-night-100"
              >
                Apply now
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
              <a
                href="mailto:lawyers@legaldesk.ai"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 px-7 text-base font-medium text-white transition hover:bg-white/10"
              >
                <Mail size={16} />
                Email us first
              </a>
            </div>
          </Reveal>

          <p className="mt-10 text-center text-xs text-ink-400">
            We are not a law firm. We do not represent clients. The platform is
            a technology intermediary connecting users with independently
            practicing advocates.
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
