import type { Metadata } from "next";
import "./globals.css";
import { HeaderBell } from "@/components/notifications/header-bell";

export const metadata: Metadata = {
  title: "LegalDesk AI — AI-powered legal help for India",
  description:
    "Plain-language legal triage, document automation, and lawyer consultations. BCI-compliant, DPDP-aligned, built for India.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "LegalDesk AI",
    title: "LegalDesk AI — AI-powered legal help for India",
    description:
      "Triage. Documents. Lawyer calls. BCI-compliant. India-resident data."
  },
  twitter: {
    card: "summary_large_image",
    title: "LegalDesk AI",
    description:
      "AI-powered legal help for India — triage, documents, and lawyer calls."
  },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh font-sans">
        <HeaderBell />
        {children}
      </body>
    </html>
  );
}
