// Auto-scrolling marquee of compliance + capability badges.
// Doubled content trick produces a seamless loop via CSS keyframes.
const ITEMS = [
  "DPDP Act 2023",
  "BCI Rule 36",
  "Data resident in Mumbai (ap-south-1)",
  "Razorpay · UPI · Stripe",
  "Hindi + English",
  "WCAG 2.1 AA",
  "256-bit at rest",
  "Verified advocates only",
  "Browser-native calls — no app"
];

export function TrustStrip() {
  return (
    <section className="relative overflow-hidden border-y border-white/5 bg-night-900 py-10 text-white">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-night-900 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-night-900 to-transparent" />
      <div className="flex w-max animate-marquee gap-12 whitespace-nowrap text-sm text-night-100/70">
        {[...ITEMS, ...ITEMS].map((item, i) => (
          <span key={i} className="flex items-center gap-3">
            <span className="h-1 w-1 rounded-full bg-accent-400/70" />
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
