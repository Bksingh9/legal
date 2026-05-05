import { ComplianceBanner } from "@/components/landing/compliance-banner";
import { Hero } from "@/components/landing/hero";
import { Tiers } from "@/components/landing/tiers";

export default function HomePage() {
  return (
    <main>
      <ComplianceBanner />
      <Hero />
      <Tiers />
      <footer className="border-t border-ink-100 bg-ink-50">
        <div className="container py-10 text-sm text-ink-400">
          <p className="font-medium text-ink-700">LegalDesk AI</p>
          <p className="mt-2 max-w-2xl">
            Generated outputs are produced by AI. Not legal advice. Consult a qualified
            advocate for case-specific opinion. Data stored in India (ap-south-1) per DPDP Act 2023.
          </p>
          <p className="mt-4 text-xs">© {new Date().getFullYear()} LegalDesk AI</p>
        </div>
      </footer>
    </main>
  );
}
