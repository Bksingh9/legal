import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Aurora } from "./aurora";
import { Reveal } from "@/components/ui/motion";

export function BigCTA() {
  return (
    <section className="relative isolate overflow-hidden bg-night-900 text-white">
      <Aurora className="opacity-80" />
      <div className="container relative py-28 md:py-36">
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance font-serif text-4xl md:text-6xl">
            One paragraph. One page. One call away.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-lg text-night-100/80">
            Most people resolve their issue with the free triage alone. The rest
            spend ₹199 — or talk to an advocate for free.
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
              href="/pricing"
              className="inline-flex h-12 items-center rounded-full border border-white/20 px-7 text-base font-medium text-white transition hover:bg-white/10"
            >
              See all prices
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
