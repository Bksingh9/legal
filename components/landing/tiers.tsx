type Tier = {
  name: string;
  price: string;
  tagline: string;
  bullets: string[];
};

const tiers: Tier[] = [
  {
    name: "Tier 1 — AI Triage",
    price: "Free",
    tagline: "1-page case prep PDF in minutes.",
    bullets: [
      "Hindi + English (text or voice)",
      "Classification across 10 legal domains",
      "Likely sections, next steps, urgency",
      "Documents to gather checklist"
    ]
  },
  {
    name: "Tier 2 — Document Automation",
    price: "₹199 – ₹1,499",
    tagline: "Court-ready drafts, generated and delivered.",
    bullets: [
      "Legal notice — ₹499",
      "Reply to legal notice — ₹699",
      "Rent agreement (11-month) — ₹399",
      "Consumer complaint (NCDRC) — ₹599",
      "RTI application — ₹199",
      "S.138 cheque bounce notice — ₹699",
      "Add-on: Lawyer review (24h) — +₹499"
    ]
  },
  {
    name: "Tier 3 — Talk to a Lawyer",
    price: "₹9–15 / min",
    tagline: "Matched in under 4 hours.",
    bullets: [
      "15-min pack — ₹199",
      "30-min pack — ₹349",
      "60-min pack — ₹599",
      "Specialization + language + state match",
      "Auto-transcript and summary email",
      "Free re-match if not satisfied"
    ]
  },
  {
    name: "LegalDesk Plus",
    price: "₹999 / year",
    tagline: "For people who deal with paperwork year-round.",
    bullets: [
      "Unlimited document generation",
      "60 mins/year of consultation included",
      "Priority callback (<1 hour)",
      "Document vault and renewal reminders"
    ]
  }
];

export function Tiers() {
  return (
    <section className="border-t border-ink-100 bg-ink-50">
      <div className="container py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-ink-900 md:text-3xl">
          Three layers, one price-aware journey.
        </h2>
        <p className="mt-3 max-w-2xl text-ink-700">
          Start with free triage. Buy a document if you need paperwork. Talk to a lawyer
          when you need a human. Upgrade to Plus if you have ongoing needs.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="flex flex-col rounded-xl border border-ink-100 bg-white p-6 shadow-sm"
            >
              <p className="text-sm font-medium text-brand-600">{tier.name}</p>
              <p className="mt-2 text-2xl font-semibold text-ink-900">{tier.price}</p>
              <p className="mt-1 text-sm text-ink-400">{tier.tagline}</p>
              <ul className="mt-4 space-y-2 text-sm text-ink-700">
                {tier.bullets.map((b) => (
                  <li key={b} className="flex gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
