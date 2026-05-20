"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

const WORDS = ["disputes", "notices", "contracts", "claims", "tenancy issues"] as const;
const INTERVAL_MS = 2400;

export function RotatingWord() {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setI((v) => (v + 1) % WORDS.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, [reduce]);

  const longest = WORDS.reduce((a, b) => (a.length > b.length ? a : b));

  return (
    <span className="relative inline-block align-baseline" aria-live="polite">
      <span aria-hidden className="invisible whitespace-nowrap italic">
        {longest}
      </span>
      <span className="absolute inset-0 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={WORDS[i]}
            initial={reduce ? false : { y: "100%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: "-100%", opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 0.7, 0.25, 1] }}
            className="block whitespace-nowrap bg-gradient-to-r from-accent-400 via-accent-200 to-accent-400 bg-clip-text italic text-transparent"
          >
            {WORDS[i]}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}
