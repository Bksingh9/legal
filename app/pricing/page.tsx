import Link from "next/link";
import { Check } from "lucide-react";
import { StartPlusButton } from "@/components/pricing/start-plus";
import { PageHeader } from "@/components/landing/page-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { Reveal } from "@/components/ui/motion";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Pricing — LegalDesk AI",
  description:
    "Plain-language legal triage is free. Documents start at Rs 199. LegalDesk Plus at Rs 999/year covers unlimited documents and 60 minutes of consultation."
};
export const dynamic = "force-dynamic";

type TierProps = {
  title: string;
  price: string;
  priceNote?: string;
  tagline: string;
  features: string[];
  cta?: { href: string; label: string };
  children?: React.ReactNode;
  highlight?: boolean;
};

// /pricing is intentionally public — visitors need to see what they'd
// pay before signing up. The StartPlusButton itself handles the auth
// gate at the moment a user tries to begin a subscription.
export default async function PricingPage() {
  const supa = getSupabaseServerClient();
  const mockMode = !supa;

  return (
    <main>
      <PageHeader
        eyebrow="Pricing"
        title="Pay per document, or unlock everything with Plus."
        description="Triage is always free. You only pay when you need paperwork or a human."
      />

      <section className="bg-white py-16 md:py-20">
        <div className="container max-w-5xl">
          {mockMode ? (
            <div className="mb-8 rounded-xl border border-accent-200 bg-accent-50 p-3 text-xs text-ink-900">
              Running in mock mode. Subscription start returns a sub_mock id.
            </div>
          ) : null}

          <div className="grid gap-5 md:grid-cols-3">
            <Tier
              title="Triage"
              price="Free"
              tagline="1-page case prep, every time."
              features={[
                "Plain-language case prep",
                "Hindi + English voice + text",
                "PDF download"
              ]}
              cta={{ href: "/triage", label: "Run a triage" }}
            />
            <Tier
              title="Documents"
              price="₹199"
              priceNote="– ₹1,499"
              tagline="Court-ready drafts, on demand."
              features={[
                "Legal notice — ₹499",
                "Reply to legal notice — ₹699",
                "Rent agreement, RTI, consumer complaint",
                "Optional lawyer review — +₹499"
              ]}
              cta={{ href: "/documents", label: "Browse documents" }}
            />
            <Tier
              title="LegalDesk Plus"
              price="₹999"
              priceNote="/ year"
              tagline="For ongoing paperwork."
              features={[
                "Unlimited document generation",
                "60 minutes of consultation per year",
                "Priority callback (under 1 hour)",
                "Document vault + renewal reminders"
              ]}
              highlight
            >
              <StartPlusButton />
            </Tier>
          </div>

          <Reveal className="mt-16 rounded-2xl border border-ink-100 bg-ink-50/60 p-8 md:p-10">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-600">À la carte</p>
            <h2 className="mt-3 font-serif text-2xl text-ink-900 md:text-3xl">
              Lawyer calls — pay only for what you use.
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                { label: "15 min", price: "₹199" },
                { label: "30 min", price: "₹349" },
                { label: "60 min", price: "₹599" }
              ].map((p) => (
                <div
                  key={p.label}
                  className="flex items-baseline justify-between rounded-xl border border-ink-100 bg-white px-5 py-4"
                >
                  <span className="text-sm text-ink-700">{p.label} consult</span>
                  <span className="font-serif text-xl text-ink-900">{p.price}</span>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-ink-400">
              First 15-minute consult is free. Re-match is free if you&apos;re not
              satisfied with the first one.
            </p>
          </Reveal>

          <p className="mt-12 text-center text-xs text-ink-400">
            All prices in Indian Rupees, inclusive of applicable taxes. Billing via
            Razorpay. NRI customers can pay in USD via Stripe.
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function Tier({ title, price, priceNote, tagline, features, cta, children, highlight }: TierProps) {
  return (
    <div
      className={[
        "group relative flex flex-col rounded-2xl border p-7 transition",
        highlight
          ? "border-night-900 bg-night-900 text-white shadow-2xl shadow-night-900/10"
          : "border-ink-100 bg-white hover:border-ink-200 hover:shadow-lg"
      ].join(" ")}
    >
      {highlight ? (
        <div className="absolute -top-3 left-7 inline-flex items-center rounded-full bg-accent-400 px-3 py-1 text-xs font-medium text-night-900">
          Best value
        </div>
      ) : null}
      <p className={["text-sm font-medium", highlight ? "text-accent-400" : "text-brand-600"].join(" ")}>
        {title}
      </p>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-serif text-4xl">{price}</span>
        {priceNote ? (
          <span className={["text-sm", highlight ? "text-night-100/70" : "text-ink-400"].join(" ")}>
            {priceNote}
          </span>
        ) : null}
      </div>
      <p className={["mt-2 text-sm", highlight ? "text-night-100/80" : "text-ink-400"].join(" ")}>
        {tagline}
      </p>
      <ul
        className={["mt-6 flex-1 space-y-3 text-sm", highlight ? "text-night-100" : "text-ink-700"].join(" ")}
      >
        {features.map((f) => (
          <li key={f} className="flex gap-2.5">
            <Check size={16} className={["mt-0.5 shrink-0", highlight ? "text-accent-400" : "text-brand-500"].join(" ")} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-7">
        {children ?? (cta ? (
          <Link
            href={cta.href}
            className={[
              "inline-flex h-11 w-full items-center justify-center rounded-full text-sm font-medium transition",
              highlight
                ? "bg-white text-night-900 hover:bg-night-100"
                : "bg-night-900 text-white hover:bg-night-700"
            ].join(" ")}
          >
            {cta.label}
          </Link>
        ) : null)}
      </div>
    </div>
  );
}
