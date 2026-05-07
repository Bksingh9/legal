import { redirect } from "next/navigation";
import { StartPlusButton } from "@/components/pricing/start-plus";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Pricing — LegalDesk AI",
  description:
    "Plain-language legal triage is free. Documents start at Rs 199. LegalDesk Plus at Rs 999/year covers unlimited documents and 60 minutes of consultation."
};
export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const supa = getSupabaseServerClient();
  let mockMode = !supa;
  if (supa) {
    const {
      data: { user }
    } = await supa.auth.getUser();
    if (!user) redirect("/auth/login?next=/pricing");
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-12">
      <header>
        <p className="text-xs uppercase tracking-wide text-neutral-500">Pricing</p>
        <h1 className="text-2xl font-semibold">Pay per document, or unlock everything with Plus.</h1>
      </header>

      {mockMode ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          Running in mock mode. Subscription start returns a sub_mock id.
        </p>
      ) : null}

      <section className="grid gap-6 md:grid-cols-3">
        <Tier
          title="Triage"
          price="Free"
          features={[
            "Plain-language case prep",
            "Hindi + English voice + text",
            "PDF download"
          ]}
          cta={{ href: "/triage", label: "Run a triage" }}
        />
        <Tier
          title="Documents"
          price="From Rs 199"
          features={[
            "Legal notice (Rs 499)",
            "Reply to legal notice (Rs 699)",
            "Rent agreement, RTI, consumer complaint",
            "Optional lawyer review (+ Rs 499)"
          ]}
          cta={{ href: "/documents", label: "Browse documents" }}
        />
        <Tier
          title="LegalDesk Plus"
          price="Rs 999 / year"
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
      </section>

      <p className="text-xs text-neutral-500">
        All prices in Indian Rupees, inclusive of applicable taxes. We bill via
        Razorpay. NRI customers can pay in USD via Stripe (coming soon).
      </p>
    </main>
  );
}

function Tier({
  title,
  price,
  features,
  cta,
  children,
  highlight
}: {
  title: string;
  price: string;
  features: string[];
  cta?: { href: string; label: string };
  children?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "flex flex-col gap-3 rounded-md border p-5 " +
        (highlight ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200")
      }
    >
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-2xl font-semibold">{price}</p>
      <ul className="flex flex-col gap-1 text-sm">
        {features.map((f) => (
          <li key={f}>· {f}</li>
        ))}
      </ul>
      <div className="mt-auto">
        {children ?? (cta ? (
          <a
            href={cta.href}
            className={
              "inline-block rounded-md px-4 py-2 text-sm font-medium " +
              (highlight
                ? "bg-white text-neutral-900 hover:bg-neutral-100"
                : "bg-neutral-900 text-white hover:bg-neutral-700")
            }
          >
            {cta.label}
          </a>
        ) : null)}
      </div>
    </div>
  );
}
