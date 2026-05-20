import { Hero } from "@/components/landing/hero";
import { TrustStrip } from "@/components/landing/trust-strip";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Tiers } from "@/components/landing/tiers";
import { FAQ } from "@/components/landing/faq";
import { BigCTA } from "@/components/landing/big-cta";
import { SiteFooter } from "@/components/landing/site-footer";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <TrustStrip />
      <HowItWorks />
      <Tiers />
      <FAQ />
      <BigCTA />
      <SiteFooter />
    </main>
  );
}
