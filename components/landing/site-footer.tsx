import Link from "next/link";

const nav: Array<{ heading: string; links: Array<{ href: string; label: string }> }> = [
  {
    heading: "Product",
    links: [
      { href: "/triage", label: "AI triage" },
      { href: "/documents", label: "Documents" },
      { href: "/talk-to-lawyer", label: "Talk to a lawyer" },
      { href: "/pricing", label: "Pricing" }
    ]
  },
  {
    heading: "For advocates",
    links: [
      { href: "/for-lawyers", label: "Overview" },
      { href: "/lawyer/apply", label: "Apply to panel" },
      { href: "/lawyer", label: "Advocate dashboard" }
    ]
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/blog", label: "Writing" },
      { href: "mailto:hello@legaldesk.ai", label: "Contact" }
    ]
  },
  {
    heading: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/refunds-cancellation", label: "Refunds" },
      { href: "/grievance", label: "Grievance" }
    ]
  }
];

export function SiteFooter() {
  return (
    <footer className="bg-night-900 text-night-100/85">
      <div className="container grid gap-12 py-20 md:grid-cols-[1.4fr_3fr]">
        <div>
          <Link href="/" className="flex items-center gap-2 text-white">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-accent-400 to-brand-500 text-sm font-semibold text-night-900">
              L
            </span>
            <span className="text-lg tracking-tight">LegalDesk</span>
          </Link>
          <p className="mt-5 max-w-md text-sm leading-relaxed">
            Generated outputs are produced by AI. Not legal advice. Consult a qualified
            advocate for case-specific opinion. Data stored in India (ap-south-1) per the
            DPDP Act 2023.
          </p>
          <p className="mt-5 text-xs text-night-100/70">
            © {new Date().getFullYear()} LegalDesk AI · Technology intermediary, not a law firm
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {nav.map((col) => (
            <div key={col.heading}>
              <p className="text-xs uppercase tracking-wider text-white">{col.heading}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="container flex flex-col items-start justify-between gap-2 py-6 text-xs text-night-100/70 md:flex-row md:items-center">
          <span>BCI Rule 36 compliant · No advocate advertising</span>
          <span>Made in India · Calls in Hindi, English, and 6 regional languages</span>
        </div>
      </div>
    </footer>
  );
}
