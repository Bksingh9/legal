export const metadata = {
  title: "Terms of Service — LegalDesk AI",
  description: "Terms governing use of the LegalDesk AI platform."
};

export default function TermsPage() {
  return (
    <main className="container max-w-3xl py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-ink-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-ink-400">Last updated: 6 May 2026</p>

      <section className="prose mt-8 space-y-4 text-ink-700">
        <p>
          By using LegalDesk AI (&quot;Platform&quot;), you accept these Terms. If you do
          not agree, do not use the Platform.
        </p>

        <h2 className="mt-6 text-xl font-semibold text-ink-900">1. Nature of service</h2>
        <p>
          LegalDesk AI provides (a) AI-generated legal triage and document drafts, and
          (b) intake and routing for consultations with independently practicing advocates.
          We are not a law firm. We do not represent you. AI-generated outputs are not
          legal advice. Consultations conducted via the Platform are between you and the
          advocate; the Platform acts as a technology intermediary.
        </p>

        <h2 className="mt-6 text-xl font-semibold text-ink-900">2. BCI compliance</h2>
        <p>
          The Platform complies with Bar Council of India Rule 36. We do not advertise
          individual advocates and do not display their names, photographs, or
          testimonials. Lawyers on the Platform are matched to your query using
          specialization, language, and state.
        </p>

        <h2 className="mt-6 text-xl font-semibold text-ink-900">3. Eligibility</h2>
        <p>You must be at least 18 years old and capable of entering into a binding contract under Indian law.</p>

        <h2 className="mt-6 text-xl font-semibold text-ink-900">4. Pricing and refunds</h2>
        <ul className="ml-6 list-disc space-y-1">
          <li>Document SKUs are charged at checkout. Once a draft is delivered, the fee is non-refundable.</li>
          <li>Consultation packs are pre-paid. If a matched advocate fails to connect, you receive a free re-match or 50% wallet credit.</li>
          <li>LegalDesk Plus auto-renews annually unless cancelled before renewal.</li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold text-ink-900">5. AI outputs</h2>
        <p>
          AI outputs may be incomplete or contain errors. Court- or tribunal-bound
          documents should be reviewed by a qualified advocate before filing. The
          &quot;Lawyer review&quot; add-on provides this review.
        </p>

        <h2 className="mt-6 text-xl font-semibold text-ink-900">6. User conduct</h2>
        <p>You agree not to use the Platform for unlawful purposes, to harass advocates, or to upload material that infringes third-party rights.</p>

        <h2 className="mt-6 text-xl font-semibold text-ink-900">7. Recording and consent</h2>
        <p>Consultation calls are recorded only after both you and the advocate consent. Recordings are stored in India.</p>

        <h2 className="mt-6 text-xl font-semibold text-ink-900">8. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, our aggregate liability is limited to
          the fees you paid us in the 12 months preceding the claim.
        </p>

        <h2 className="mt-6 text-xl font-semibold text-ink-900">9. Governing law</h2>
        <p>These Terms are governed by the laws of India. Courts at Bengaluru shall have exclusive jurisdiction.</p>

        <h2 className="mt-6 text-xl font-semibold text-ink-900">10. Contact</h2>
        <p>
          Email <a className="text-brand-600 underline" href="mailto:hello@legaldesk.ai">hello@legaldesk.ai</a> for any questions about these Terms.
        </p>
      </section>
    </main>
  );
}
