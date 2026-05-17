import { LeadCapture } from "@/components/consult/lead-capture";

export const metadata = {
  title: "Talk to a lawyer in 10 minutes — LegalDesk AI",
  description:
    "Describe your legal issue in one line. A verified Indian advocate will call you back in 10 minutes. First call free."
};

export default function TalkToLawyerPage() {
  return (
    <main className="container max-w-3xl py-12 md:py-16">
      <header className="max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-wide text-brand-600">
          Talk to a lawyer
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink-900 md:text-4xl">
          A verified advocate calls you back in 10 minutes.
        </h1>
        <p className="mt-4 text-lg text-ink-700">
          Tell us your situation in one line. We&apos;ll match you with a
          verified Indian advocate by specialization and language. First
          call is free.
        </p>
      </header>

      <div className="mt-8 grid gap-8 md:grid-cols-[2fr_1fr]">
        <LeadCapture />
        <aside className="flex flex-col gap-5 rounded-md border border-ink-100 bg-ink-50 p-5 text-sm text-ink-700">
          <div>
            <p className="font-semibold text-ink-900">What you get</p>
            <ul className="mt-2 space-y-1.5">
              <li>• Verified advocate, matched by issue + state + language</li>
              <li>• Browser call — no app to download</li>
              <li>• 15-minute first consult is free</li>
              <li>• Optional follow-up via UPI: ₹199 (15 min), ₹349 (30 min), ₹599 (60 min)</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-ink-900">Compliance</p>
            <ul className="mt-2 space-y-1.5 text-xs text-ink-700">
              <li>BCI Rule 36 — no advocate advertising on this site</li>
              <li>DPDP Act 2023 — data stored in India (Mumbai)</li>
              <li>Calls recorded only after both parties consent</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-ink-900">Already prefer self-serve?</p>
            <ul className="mt-2 space-y-1.5">
              <li>
                <a href="/triage" className="text-brand-700 underline">
                  Run free AI triage
                </a>{" "}
                — instant case prep
              </li>
              <li>
                <a href="/documents" className="text-brand-700 underline">
                  Generate a legal document
                </a>{" "}
                — free download
              </li>
            </ul>
          </div>
        </aside>
      </div>

      <p className="mt-12 text-xs text-ink-400">
        Generated outputs and matched-advocate consultations are not legal
        advice. The platform is a technology intermediary connecting users
        with independently practicing advocates.
      </p>
    </main>
  );
}
