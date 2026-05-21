import { PageHeader } from "./page-header";
import { SiteFooter } from "./site-footer";

type Props = {
  eyebrow: string;
  title: string;
  description?: string;
  lastUpdated: string;
  children: React.ReactNode;
};

// Shared frame for the four legal/policy surfaces (privacy, terms, refunds,
// grievance). Provides the dark hero, the prose container with consistent
// heading/list styling, and the footer — so the only thing each policy page
// authors is the actual content.
export function PolicyShell({ eyebrow, title, description, lastUpdated, children }: Props) {
  return (
    <main>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      <section className="bg-white py-16 md:py-20">
        <div className="container max-w-3xl">
          <p className="mb-8 text-xs uppercase tracking-wider text-ink-400">
            Last updated · {lastUpdated}
          </p>

          <div
            className={[
              "flex flex-col gap-5 text-pretty text-base leading-[1.75] text-ink-700",
              "[&_h2]:mt-12 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-ink-900 md:[&_h2]:text-3xl",
              "[&_h3]:mt-6 [&_h3]:font-medium [&_h3]:text-lg [&_h3]:text-ink-900",
              "[&_a]:text-brand-700 [&_a]:underline [&_a]:underline-offset-4",
              "[&_strong]:font-medium [&_strong]:text-ink-900",
              "[&_ul]:my-1 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1.5",
              "[&_ol]:my-1 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1.5",
              "[&_li]:pl-1 [&_li_p]:my-1"
            ].join(" ")}
          >
            {children}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
