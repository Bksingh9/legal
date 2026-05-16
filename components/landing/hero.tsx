import Link from "next/link";

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
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/triage"
            className="inline-flex h-12 items-center justify-center rounded-md bg-brand-600 px-6 text-base font-medium text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            Start free triage
          </Link>
          <Link
            href="/documents"
            className="inline-flex h-12 items-center justify-center rounded-md border border-ink-200 bg-white px-6 text-base font-medium text-ink-900 transition-colors hover:bg-ink-50"
          >
            Browse documents
          </Link>
        </div>
        <p className="mt-4 text-sm text-ink-400">
          Free to start. Sign in with your email — no app to download, no card on file.
        </p>
      </div>
    </section>
  );
}
