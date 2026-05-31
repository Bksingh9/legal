"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const links = [
  { href: "/triage", label: "Triage" },
  { href: "/talk-to-lawyer", label: "Talk to a lawyer" },
  { href: "/documents", label: "Documents" },
  { href: "/pricing", label: "Pricing" },
  { href: "/for-lawyers", label: "For advocates" },
  { href: "/for-business", label: "For business" }
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        scrolled
          ? "border-b border-white/10 bg-night-900/80 backdrop-blur-xl"
          : "border-b border-white/5 bg-night-900/40 backdrop-blur-md"
      ].join(" ")}
    >
      <div className="container flex h-14 items-center justify-between gap-6 text-sm">
        <Link href="/" className="flex items-center gap-2 font-medium text-white">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-accent-400 to-brand-500 text-xs font-semibold text-night-900">
            L
          </span>
          <span className="tracking-tight">LegalDesk</span>
        </Link>
        <nav className="hidden gap-7 text-night-100/80 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-white">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/auth/login"
            className="hidden text-night-100/80 transition-colors hover:text-white md:inline"
          >
            Sign in
          </Link>
          <Link
            href="/triage"
            className="inline-flex h-9 items-center rounded-full bg-white px-4 font-medium text-night-900 transition hover:bg-night-100"
          >
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}
