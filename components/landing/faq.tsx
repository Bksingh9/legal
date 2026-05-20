"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Reveal } from "@/components/ui/motion";

const items = [
  {
    q: "Is this legal advice?",
    a: "No. AI-generated outputs are general information. For case-specific opinions, talk to a verified advocate — the first 15-minute call is free."
  },
  {
    q: "Why don't I see lawyer names or photos?",
    a: "BCI Rule 36 prohibits advocate advertising. We match on specialization, language, state, and an anonymous internal rating — never on personal branding."
  },
  {
    q: "Where is my data stored?",
    a: "In Mumbai (ap-south-1), encrypted at rest. We're aligned to the DPDP Act 2023. You can export or delete everything from /account at any time."
  },
  {
    q: "What does Plus actually include?",
    a: "Unlimited document generation, 60 minutes of consultation per year, priority callback under 1 hour, and a document vault with renewal reminders — for ₹999/year."
  },
  {
    q: "Do I need to download an app?",
    a: "No. Triage, documents, and the lawyer call all run in your browser. Calls are WebRTC — no install."
  },
  {
    q: "Can I get a refund?",
    a: "Yes. Unstarted document generations and unused consultation minutes are refundable within 7 days. See /refunds-cancellation."
  }
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="bg-white py-24 md:py-32">
      <div className="container max-w-3xl">
        <Reveal className="text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Questions</p>
          <h2 className="mt-4 font-serif text-4xl text-ink-900 md:text-5xl">
            Likely on your mind.
          </h2>
        </Reveal>

        <div className="mt-12 divide-y divide-ink-100 border-y border-ink-100">
          {items.map((it, i) => {
            const isOpen = open === i;
            return (
              <Reveal as="div" key={it.q} delay={i * 0.04}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-ink-700"
                >
                  <span className="text-base font-medium text-ink-900 md:text-lg">
                    {it.q}
                  </span>
                  <Plus
                    size={18}
                    className={[
                      "shrink-0 text-ink-400 transition-transform duration-300",
                      isOpen ? "rotate-45" : ""
                    ].join(" ")}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 0.7, 0.25, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 pr-8 text-pretty text-ink-700">{it.a}</p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
