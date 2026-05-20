import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Aurora } from "./aurora";
import { RotatingWord } from "./rotating-word";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-night-900 pt-28 text-white">
      <Aurora />
      <div className="container relative pb-28 pt-16 md:pb-36 md:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-night-100 backdrop-blur">
            <Sparkles size={14} className="text-accent-400" />
            Built for India · DPDP-aligned · BCI Rule 36 compliant
          </div>
          <h1 className="mt-8 text-balance font-serif text-display font-normal text-white">
            Resolve <RotatingWord />
            <br />
            in 60 seconds.
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-pretty text-lg leading-relaxed text-night-100/85 md:text-xl">
            Describe your situation in Hindi or English. Get a plain-language case prep,
            a court-ready document, or a 15-minute call with a verified advocate — no
            app, no card on file.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/triage"
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-base font-medium text-night-900 transition hover:bg-night-100"
            >
              Start free triage
              <ArrowRight
                size={18}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
            <Link
              href="/talk-to-lawyer"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 bg-white/5 px-7 text-base font-medium text-white backdrop-blur transition hover:bg-white/10"
            >
              Talk to a lawyer
              <span className="text-night-100/70">·</span>
              <span className="text-accent-400">first call free</span>
            </Link>
          </div>
          <p className="mt-6 text-sm text-night-100/60">
            No sign-up to try. Sign in only to save results or book a call.
          </p>
        </div>

        <HeroStats />
      </div>
    </section>
  );
}

function HeroStats() {
  const stats = [
    { k: "60s", v: "average triage time" },
    { k: "10+", v: "legal domains covered" },
    { k: "₹0", v: "for the first consult" },
    { k: "🇮🇳", v: "data resident in Mumbai" }
  ];
  return (
    <div className="mx-auto mt-20 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur md:grid-cols-4">
      {stats.map((s) => (
        <div key={s.v} className="bg-night-900/40 px-6 py-5 text-center">
          <div className="font-serif text-3xl text-white">{s.k}</div>
          <div className="mt-1 text-xs uppercase tracking-wider text-night-100/60">
            {s.v}
          </div>
        </div>
      ))}
    </div>
  );
}
