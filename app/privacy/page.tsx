import { PolicyShell } from "@/components/landing/policy-shell";

export const metadata = {
  title: "Privacy Policy — LegalDesk AI",
  description:
    "How LegalDesk AI collects, processes, and protects your personal data under the DPDP Act 2023."
};

export default function PrivacyPage() {
  return (
    <PolicyShell
      eyebrow="Privacy"
      title="Privacy Policy"
      description="How LegalDesk AI collects, processes, and protects your personal data under the Digital Personal Data Protection Act, 2023."
      lastUpdated="6 May 2026"
    >
      <p>
        LegalDesk AI (&quot;we&quot;, &quot;us&quot;) is committed to protecting your personal
        data in accordance with the Digital Personal Data Protection Act, 2023
        (&quot;DPDP Act&quot;). This page explains what we collect, why, and your rights.
      </p>

      <h2>1. Data we collect</h2>
      <ul>
        <li>Identifiers you provide: email address, phone number, name.</li>
        <li>Legal queries you submit for AI triage (text and voice).</li>
        <li>Document inputs you submit for automated drafting.</li>
        <li>Payment metadata returned by Razorpay or Stripe (we do not store card data).</li>
        <li>Usage analytics (anonymized device, browser, page views) via PostHog.</li>
        <li>Error telemetry via Sentry.</li>
      </ul>

      <h2>2. Purpose</h2>
      <ul>
        <li>To deliver triage, document, and consultation services you requested.</li>
        <li>To match you with a verified advocate (Tier 3) by language, state, and specialization.</li>
        <li>To send transactional email and WhatsApp messages about your purchases.</li>
        <li>To improve product quality. We do not sell your personal data.</li>
      </ul>

      <h2>3. Data residency</h2>
      <p>
        All personal data is stored in India (Supabase ap-south-1, Mumbai). Backups remain in India.
      </p>

      <h2>4. Sharing</h2>
      <ul>
        <li>
          Anthropic (Claude API) processes your text to produce triage and draft outputs.
          We do not send Anthropic your phone number or payment data.
        </li>
        <li>Razorpay and Stripe process payments under their respective privacy policies.</li>
        <li>Exotel and 100ms power masked-number calls and video; recordings are stored by us in India.</li>
        <li>Resend, AiSensy/Gupshup deliver transactional email and WhatsApp.</li>
      </ul>

      <h2>5. Your rights under the DPDP Act</h2>
      <ul>
        <li>Right to access, correct, and erase your personal data.</li>
        <li>Right to withdraw consent at any time.</li>
        <li>Right to nominate another individual to exercise rights on your behalf.</li>
        <li>Right to grievance redressal (see Section 7).</li>
      </ul>
      <p>
        Email <a href="mailto:privacy@legaldesk.ai">privacy@legaldesk.ai</a> with any of the
        above requests. We respond within 7 business days.
      </p>

      <h2>6. Retention</h2>
      <p>
        We retain triage and document data for 24 months unless you request earlier
        deletion. Consultation recordings are retained for 90 days. Payment records
        are retained for 8 years per Indian tax law.
      </p>

      <h2>7. Grievance Officer</h2>
      <p>
        [Name TBD], Grievance Officer, LegalDesk AI.
        <br />
        Email:{" "}
        <a href="mailto:grievance@legaldesk.ai">grievance@legaldesk.ai</a>
      </p>

      <h2>8. Children</h2>
      <p>
        LegalDesk AI is not intended for users under 18. We do not knowingly collect data from minors.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update this policy. Material changes will be notified by email at least 14 days
        before they take effect.
      </p>
    </PolicyShell>
  );
}
