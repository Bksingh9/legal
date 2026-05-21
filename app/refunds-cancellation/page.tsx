import { PolicyShell } from "@/components/landing/policy-shell";

export const metadata = {
  title: "Refunds & cancellation — LegalDesk AI",
  description:
    "Refund and cancellation policy for documents, consultations, and LegalDesk Plus subscriptions."
};

export default function RefundsPage() {
  return (
    <PolicyShell
      eyebrow="Refunds"
      title="Refunds & cancellation"
      description="When and how you can request a refund or cancellation across our paid services."
      lastUpdated="17 May 2026"
    >
      <p>
        This policy explains when and how you can request a refund or cancellation. It
        applies to all paid services on LegalDesk AI.
      </p>

      <h2>1. Tier-0 services (free)</h2>
      <p>
        AI triage, document previews, and free PDF/DOCX downloads are provided at zero
        cost. There is nothing to refund.
      </p>

      <h2>2. Document purchases</h2>
      <ul>
        <li>
          You may cancel an order before the final document is generated — your payment
          is refunded in full within 7 business days to the original payment method.
        </li>
        <li>
          Once the final PDF/DOCX is generated and emailed, the fee is{" "}
          <strong>non-refundable</strong> (it&apos;s a digital good you have already received).
        </li>
        <li>
          If the generated document has a factual defect we are responsible for, contact{" "}
          <a href="mailto:hello@legaldesk.ai">hello@legaldesk.ai</a> within 7 days. We will
          regenerate the document at no charge or, at your option, refund the fee in full.
        </li>
      </ul>

      <h2>3. Consultation packs (Tier 3)</h2>
      <ul>
        <li>
          <strong>Before a lawyer accepts:</strong> full refund within 7 business days.
        </li>
        <li>
          <strong>After a lawyer accepts but before the call starts:</strong> full refund
          within 7 business days.
        </li>
        <li>
          <strong>If the matched advocate fails to connect</strong> during your stated
          window: free re-match within 7 days, or 50% wallet credit, or full refund —
          your choice.
        </li>
        <li>
          <strong>After a completed consultation:</strong> the fee is non-refundable,
          except where the &quot;Not satisfied&quot; dispute path applies (see §4 below).
        </li>
      </ul>

      <h2>4. &quot;Not satisfied&quot; dispute path</h2>
      <p>
        If a consultation completes but you believe the advocate did not deliver the
        service in good faith (e.g. they did not address your question, the call was cut
        short by the advocate, etc.), email{" "}
        <a href="mailto:disputes@legaldesk.ai">disputes@legaldesk.ai</a> within 7 days of
        the consultation. We will review the consultation summary (and recording, if both
        parties consented) and respond within 7 business days with one of: free re-match,
        50% wallet credit, or full refund.
      </p>

      <h2>5. LegalDesk Plus subscription</h2>
      <ul>
        <li>
          Cancel any time from <a href="/account">/account</a> — your benefits continue
          until the renewal date, after which no further charges occur.
        </li>
        <li>
          Pro-rated refunds are not available for partial periods of an annual subscription.
        </li>
        <li>
          If LegalDesk Plus is unavailable for more than 14 consecutive days due to an
          outage on our side, we will issue a pro-rated refund for the affected period upon
          request.
        </li>
      </ul>

      <h2>6. How to request a refund</h2>
      <p>
        Email <a href="mailto:hello@legaldesk.ai">hello@legaldesk.ai</a> with your order or
        consultation reference. We acknowledge requests within 1 business day and process
        eligible refunds within 7 business days. Refunds are returned to the original
        payment method (UPI / card / netbanking).
      </p>

      <h2>7. Chargebacks</h2>
      <p>
        Please contact us first before raising a chargeback with your bank or card network.
        We can almost always resolve issues faster directly. Chargebacks raised without
        prior contact may delay future bookings while disputes are reviewed.
      </p>
    </PolicyShell>
  );
}
