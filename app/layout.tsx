import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { HeaderBell } from "@/components/notifications/header-bell";
import { PostHogProvider } from "@/components/analytics/posthog-provider";
import { SiteNav } from "@/components/landing/site-nav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap"
});

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
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body className="min-h-dvh font-sans">
        <PostHogProvider />
        <SiteNav />
        <HeaderBell />
        {children}
      </body>
    </html>
  );
}
