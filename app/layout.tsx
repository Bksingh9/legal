import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LegalDesk AI — AI-powered legal help for India",
  description:
    "Plain-language legal triage, document automation, and lawyer consultations. BCI-compliant, DPDP-aligned, built for India.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000")
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
