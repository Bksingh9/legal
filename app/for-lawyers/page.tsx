import Link from "next/link";

export const metadata = {
  title: "For advocates — LegalDesk AI",
  description:
    "Join LegalDesk AI's verified advocate panel. AI-routed clients, no advertising risk, UPI payouts, BCI Rule 36 compliant by construction."
};

export default function ForLawyersPage() {
  return (
    <main className="container max-w-3xl py-16">
      <p className="text-sm font-medium uppercase tracking-wide text-brand-600">
        For advocates
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink-900 md:text-4xl">
        Get matched with paying clients. Keep your name off our marketing.
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-700">
        LegalDesk AI routes Indian legal queries to verified advocates by
        specialization, language, and state. You see only the offers that
        match your profile. We never publish your name, photograph or
        rating — BCI Rule 36 compliant by construction.
      </p>

      <section className="mt-12 grid gap-6 md:grid-cols-2">
        <Card title="How it works">
          <ol className="ml-4 list-decimal space-y-1 text-sm text-ink-700">
            <li>Apply with your Bar Council ID, state and specializations.</li>
            <li>We verify against the relevant state bar directory (24–48 h).</li>
            <li>Once verified, consultation offers appear in your dashboard.</li>
            <li>Accept within your stated window; first to accept wins.</li>
            <li>Take the call/video on browser-native Jitsi — no SDK.</li>
            <li>UPI payout to your VPA 24 h after the consult completes.</li>
          </ol>
        </Card>
        <Card title="What you keep">
          <ul className="ml-4 list-disc space-y-1 text-sm text-ink-700">
            <li>55–65% of the consultation fee, after platform fee + GST.</li>
            <li>The client relationship — you can take them off-platform.</li>
            <li>Your anonymity in every public surface (anon_slug only).</li>
            <li>Your professional discretion — accept or decline anything.</li>
          </ul>
        </Card>
        <Card title="BCI Rule 36 compliance">
          <p className="text-sm text-ink-700">
            We do not advertise individual advocates. Our public surfaces
            show no names, photos, testimonials or rankings. You appear in
            client-facing UI as an anonymous reference (specialization +
            years + language + state). The platform brands itself, not
            you.
          </p>
        </Card>
        <Card title="What we ask">
          <ul className="ml-4 list-disc space-y-1 text-sm text-ink-700">
            <li>Minimum 5 hours/week of stated availability.</li>
            <li>Accept or decline offers within 30 minutes when in window.</li>
            <li>Two-party consent before any call recording.</li>
            <li>Generated drafts must be reviewed before client uses in court.</li>
          </ul>
        </Card>
      </section>

      <section className="mt-12 rounded-md border border-ink-100 bg-ink-50 p-6">
        <h2 className="text-xl font-semibold text-ink-900">
          Apply to the verified advocate panel
        </h2>
        <p className="mt-2 text-sm text-ink-700">
          Takes 5 minutes. You&apos;ll need your Bar Council ID and your
          UPI VPA for payouts.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/lawyer/apply"
            className="inline-flex h-12 items-center justify-center rounded-md bg-brand-600 px-6 text-base font-medium text-white hover:bg-brand-700"
          >
            Apply now
          </Link>
          <a
            href="mailto:lawyers@legaldesk.ai"
            className="inline-flex h-12 items-center justify-center rounded-md border border-ink-200 bg-white px-6 text-base font-medium text-ink-900 hover:bg-ink-50"
          >
            Email us first
          </a>
        </div>
      </section>

      <p className="mt-10 text-xs text-ink-400">
        We are not a law firm. We do not represent clients. The platform is
        a technology intermediary connecting users with independently
        practicing advocates.
      </p>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-ink-100 p-5">
      <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}
