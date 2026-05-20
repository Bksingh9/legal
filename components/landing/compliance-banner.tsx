// Small marketing strip used on legal/policy pages.
// The marketing home now uses TrustStrip + footer compliance text instead.
export function ComplianceBanner() {
  return (
    <div className="border-b border-ink-100 bg-ink-50">
      <div className="container py-2 text-center text-xs text-ink-400">
        AI-generated outputs are not legal advice. BCI Rule 36 compliant — no advocate
        advertising, no named lawyer profiles. Data stored in India (DPDP Act 2023).
      </div>
    </div>
  );
}
