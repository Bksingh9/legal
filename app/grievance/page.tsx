import { PolicyShell } from "@/components/landing/policy-shell";

export const metadata = {
  title: "Grievance redressal — LegalDesk AI",
  description:
    "Grievance Officer contact and escalation path under the DPDP Act 2023 and Information Technology (Intermediary Guidelines) Rules."
};

export default function GrievancePage() {
  return (
    <PolicyShell
      eyebrow="Grievance"
      title="Grievance redressal"
      description="Officer contact, escalation path, and complaint timelines under the DPDP Act 2023 and the IT (Intermediary Guidelines) Rules 2021."
      lastUpdated="17 May 2026"
    >
      <p>
        In compliance with the Digital Personal Data Protection Act, 2023 and the
        Information Technology (Intermediary Guidelines and Digital Media Ethics Code)
        Rules, 2021, LegalDesk AI publishes the contact details of its Grievance Officer
        below.
      </p>

      <h2>Grievance Officer</h2>
      <p>
        [Name to be appointed], Grievance Officer
        <br />
        LegalDesk AI
        <br />
        [Registered address to be updated]
        <br />
        Email: <a href="mailto:grievance@legaldesk.ai">grievance@legaldesk.ai</a>
        <br />
        Acknowledgement: within 24 hours of receipt.
        <br />
        Resolution: within 15 calendar days for general complaints; up to 90 days for
        matters that require investigation under the DPDP Act.
      </p>

      <h2>Data Protection Officer</h2>
      <p>
        [Name to be appointed], Data Protection Officer
        <br />
        Email: <a href="mailto:dpo@legaldesk.ai">dpo@legaldesk.ai</a>
        <br />
        Handle DPDP Act requests (access, correction, erasure, consent withdrawal) at
        this address. You can also self-serve these from{" "}
        <a href="/account">your account</a> when signed in.
      </p>

      <h2>How to file a complaint</h2>
      <ol>
        <li>Email the Grievance Officer at the address above.</li>
        <li>
          Include: your registered email/phone, a clear description of the issue, and any
          reference number (consultation ID, payment ID, document ID) that helps us locate
          the matter.
        </li>
        <li>You will receive an acknowledgement within 24 hours and a ticket reference.</li>
        <li>
          Track the ticket via reply email. We respond at every material step until
          resolution.
        </li>
      </ol>

      <h2>Escalation</h2>
      <p>
        If your grievance is not addressed within 15 calendar days, you may approach the
        Data Protection Board of India once it is constituted, or raise a complaint on the
        National Consumer Helpline at{" "}
        <a
          href="https://consumerhelpline.gov.in"
          target="_blank"
          rel="noopener noreferrer"
        >
          consumerhelpline.gov.in
        </a>
        .
      </p>

      <h2>Compliance audit</h2>
      <p>
        We publish summary statistics of grievances received, resolved and pending on a
        quarterly basis on this page once we begin processing at scale. Currently we are
        pre-launch and the register is empty.
      </p>
    </PolicyShell>
  );
}
