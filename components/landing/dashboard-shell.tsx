import Link from "next/link";
import { SiteFooter } from "./site-footer";

type DashboardLink = { href: string; label: string };

type Props = {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  tabs?: DashboardLink[];
  activeHref?: string;
  children: React.ReactNode;
  maxWidth?: "md" | "lg" | "xl";
};

// Lightweight authed-page frame. Compact light header (no Aurora) so the
// SiteNav floats over it cleanly. Tabs render as a row of pill links when
// provided. SiteFooter at the bottom keeps the brand chrome consistent
// with the marketing surfaces.
export function DashboardShell({
  eyebrow,
  title,
  description,
  actions,
  tabs,
  activeHref,
  children,
  maxWidth = "lg"
}: Props) {
  const width = {
    md: "max-w-2xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl"
  }[maxWidth];

  return (
    <main>
      <section className="border-b border-ink-100 bg-white pt-24">
        <div className={`container ${width}`}>
          <div className="flex flex-col gap-6 pb-6 pt-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-brand-600">{eyebrow}</p>
              <h1 className="mt-2 font-serif text-3xl text-ink-900 md:text-4xl">{title}</h1>
              {description ? (
                <p className="mt-3 max-w-xl text-pretty text-ink-700">{description}</p>
              ) : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
          {tabs && tabs.length > 0 ? (
            <nav aria-label="Section" className="flex flex-wrap gap-1 pb-2">
              {tabs.map((t) => {
                const active = t.href === activeHref;
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "rounded-full px-4 py-1.5 text-sm transition",
                      active
                        ? "bg-night-900 text-white"
                        : "text-ink-700 hover:bg-ink-50 hover:text-ink-900"
                    ].join(" ")}
                  >
                    {t.label}
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </div>
      </section>

      <section className="bg-white py-12 md:py-16">
        <div className={`container ${width} space-y-8`}>{children}</div>
      </section>

      <SiteFooter />
    </main>
  );
}
