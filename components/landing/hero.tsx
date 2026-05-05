import { WaitlistForm } from "@/components/waitlist-form";

export function Hero() {
  return (
    <section className="container pb-12 pt-16 md:pb-20 md:pt-24">
      <div className="max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-wide text-brand-600">
          LegalDesk AI
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink-900 md:text-5xl">
          AI-powered legal help for India — triage, documents, and lawyer calls.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-ink-700">
          Describe your situation in Hindi or English. Get a plain-language case prep,
          a court-ready document, or a 15-minute consultation with a verified advocate.
          Built for tenants, salaried Indians, SMBs, and NRIs.
        </p>
        <div className="mt-8 max-w-md">
          <WaitlistForm />
        </div>
        <p className="mt-3 text-xs text-ink-400">
          Free triage on launch. No spam. We&apos;ll only email you when LegalDesk goes live.
        </p>
      </div>
    </section>
  );
}
