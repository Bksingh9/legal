export const metadata = {
  title: "About — LegalDesk AI",
  description:
    "Who LegalDesk AI is, where the company is registered, and how to contact us."
};

export default function AboutPage() {
  return (
    <main className="container max-w-3xl py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-ink-900">About LegalDesk AI</h1>
      <p className="mt-2 text-sm text-ink-400">Last updated: 17 May 2026</p>

      <section className="prose mt-8 space-y-4 text-ink-700">
        <h2 className="mt-2 text-xl font-semibold text-ink-900">What we do</h2>
        <p>
          LegalDesk AI is an Indian legal-technology platform that
          combines AI-generated triage and document automation with
          intake and routing for consultations with independently
          practicing advocates. We are not a law firm, we do not
          represent clients, and we do not provide legal advice.
          We are a technology intermediary connecting users with
          advocates registered with the relevant State Bar Councils.
        </p>

        <h2 className="mt-6 text-xl font-semibold text-ink-900">
          Compliance framework
        </h2>
        <ul className="ml-6 list-disc space-y-1">
          <li>
            <strong>Bar Council of India Rule 36</strong> — we do not
            advertise individual advocates. No names, photos, or
            testimonials are displayed publicly.
          </li>
          <li>
            <strong>Digital Personal Data Protection Act, 2023</strong>{" "}
            — all personal data stored in India (Mumbai), explicit
            consent at point of collection, right to access / correct /
            erase available from{" "}
            <a className="text-brand-700 underline" href="/account">
              /account
            </a>
            .
          </li>
          <li>
            <strong>Information Technology Act, 2000</strong> and{" "}
            <strong>Intermediary Guidelines, 2021</strong> — Grievance
            Officer published at{" "}
            <a className="text-brand-700 underline" href="/grievance">
              /grievance
            </a>
            .
          </li>
          <li>
            <strong>Consumer Protection Act, 2019</strong> — refund and
            cancellation policy at{" "}
            <a className="text-brand-700 underline" href="/refunds-cancellation">
              /refunds-cancellation
            </a>
            .
          </li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold text-ink-900">
          Registered details
        </h2>
        <p>
          The following are placeholders until the entity is
          incorporated. Once formal incorporation completes, this page
          reflects the actual registration on file.
        </p>
        <ul className="ml-6 list-disc space-y-1">
          <li>Legal entity: [Name to be incorporated]</li>
          <li>Registered office: [Address to be updated]</li>
          <li>CIN: [Pending]</li>
          <li>GSTIN: [Pending]</li>
          <li>
            Email:{" "}
            <a className="text-brand-700 underline" href="mailto:hello@legaldesk.ai">
              hello@legaldesk.ai
            </a>
          </li>
        </ul>

        <h2 className="mt-6 text-xl font-semibold text-ink-900">
          Contact channels
        </h2>
        <ul className="ml-6 list-disc space-y-1">
          <li>
            General:{" "}
            <a className="text-brand-700 underline" href="mailto:hello@legaldesk.ai">
              hello@legaldesk.ai
            </a>
          </li>
          <li>
            Grievance:{" "}
            <a className="text-brand-700 underline" href="mailto:grievance@legaldesk.ai">
              grievance@legaldesk.ai
            </a>{" "}
            (see <a className="underline" href="/grievance">/grievance</a>)
          </li>
          <li>
            DPDP requests:{" "}
            <a className="text-brand-700 underline" href="mailto:dpo@legaldesk.ai">
              dpo@legaldesk.ai
            </a>
          </li>
          <li>
            Disputes / refunds:{" "}
            <a className="text-brand-700 underline" href="mailto:disputes@legaldesk.ai">
              disputes@legaldesk.ai
            </a>
          </li>
          <li>
            For advocates:{" "}
            <a className="text-brand-700 underline" href="mailto:lawyers@legaldesk.ai">
              lawyers@legaldesk.ai
            </a>{" "}
            (or apply at{" "}
            <a className="underline" href="/lawyer/apply">
              /lawyer/apply
            </a>
            )
          </li>
        </ul>
      </section>
    </main>
  );
}
