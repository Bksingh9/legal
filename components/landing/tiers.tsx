import Link from "next/link";
import { Check } from "lucide-react";
import { Reveal } from "@/components/ui/motion";

type Tier = {
  name: string;
  price: string;
  priceNote?: string;
  tagline: string;
  bullets: string[];
  cta: { href: string; label: string };
  highlight?: boolean;
};

const tiers: Tier[] = [
  {
    name: "Triage",
    price: "Free",
    tagline: "1-page case prep PDF in minutes.",
    bullets: [
      "Hindi + English, text or voice",
      "10+ legal domains",
      "Likely sections, next 3 steps",
      "Documents-to-gather checklist"
    ],
    cta: { href: "/triage", label: "Run free triage" }
  },
  {
    name: "Documents",
    price: "₹199",
    priceNote: "– ₹1,499",
    tagline: "Court-ready drafts, generated and delivered.",
    bullets: [
      "Legal notice · ₹499",
      "Rent agreement · ₹399",
      "Consumer complaint · ₹599",
      "Add-on: lawyer review · +₹499"
    ],
    cta: { href: "/documents", label: "Browse documents" }
  },
  {
    name: "Lawyer call",
    price: "Free",
    priceNote: "first 15 min",
    tagline: "Matched advocate calls you in 10 minutes.",
    bullets: [
      "15 min pack · ₹199",
      "30 min pack · ₹349",
      "60 min pack · ₹599",
      "Free re-match if not satisfied"
    ],
    cta: { href: "/talk-to-lawyer", label: "Talk to a lawyer" },
    highlight: true
  },
  {
    name: "LegalDesk Plus",
    price: "₹999",
    priceNote: "/ year",
    tagline: "For people who deal with paperwork year-round.",
    bullets: [
      "Unlimited document generation",
      "60 mins/year of consultation",
      "Priority callback (<1 hour)",
      "Document vault + reminders"
    ],
    cta: { href: "/pricing", label: "See Plus details" }
  }
];

export function Tiers() {
  return (
    <section className="relative bg-white py-24 md:py-32">
      <div className="container">
        <Reveal className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Pricing</p>
          <h2 className="mt-4 font-serif text-4xl text-ink-900 md:text-5xl">
            Three layers, one price-aware journey.
          </h2>
          <p className="mt-5 text-lg text-ink-700">
            Start with free triage. Buy a document if you need paperwork. Talk to a lawyer
            when you need a human. Upgrade to Plus if you have ongoing needs.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier, i) => (
            <Reveal
              key={tier.name}
              delay={i * 0.06}
              className={[
                "group relative flex flex-col rounded-2xl border p-7 transition",
                tier.highlight
                  ? "border-night-900 bg-night-900 text-white shadow-2xl shadow-night-900/10"
                  : "border-ink-100 bg-white hover:border-ink-200 hover:shadow-lg"
              ].join(" ")}
            >
              {tier.highlight ? (
                <div className="absolute -top-3 left-7 inline-flex items-center rounded-full bg-accent-400 px-3 py-1 text-xs font-medium text-night-900">
                  Most chosen
                </div>
              ) : null}
              <p
                className={[
                  "text-sm font-medium",
                  tier.highlight ? "text-accent-400" : "text-brand-600"
                ].join(" ")}
              >
                {tier.name}
              </p>
              <div className="mt-3 flex items-baseline gap-1.5">
                <p className="font-serif text-4xl">{tier.price}</p>
                {tier.priceNote ? (
                  <p
                    className={[
                      "text-sm",
                      tier.highlight ? "text-night-100/70" : "text-ink-400"
                    ].join(" ")}
                  >
                    {tier.priceNote}
                  </p>
                ) : null}
              </div>
              <p
                className={[
                  "mt-2 text-sm",
                  tier.highlight ? "text-night-100/80" : "text-ink-400"
                ].join(" ")}
              >
                {tier.tagline}
              </p>
              <ul
                className={[
                  "mt-6 flex-1 space-y-3 text-sm",
                  tier.highlight ? "text-night-100" : "text-ink-700"
                ].join(" ")}
              >
                {tier.bullets.map((b) => (
                  <li key={b} className="flex gap-2.5">
                    <Check
                      size={16}
                      className={[
                        "mt-0.5 shrink-0",
                        tier.highlight ? "text-accent-400" : "text-brand-500"
                      ].join(" ")}
                    />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={tier.cta.href}
                className={[
                  "mt-7 inline-flex h-11 items-center justify-center rounded-full text-sm font-medium transition",
                  tier.highlight
                    ? "bg-white text-night-900 hover:bg-night-100"
                    : "bg-night-900 text-white hover:bg-night-700"
                ].join(" ")}
              >
                {tier.cta.label}
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
