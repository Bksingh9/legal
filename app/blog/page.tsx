import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { listPublishedPosts } from "@/lib/blog/loader";
import { PageHeader } from "@/components/landing/page-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { Reveal } from "@/components/ui/motion";

export const metadata = {
  title: "Legal explainers — LegalDesk AI",
  description:
    "Plain-language explainers of common Indian legal questions: notices, agreements, complaints, RTI, family, consumer, criminal procedure."
};

export const revalidate = 3600;

export default async function BlogIndex() {
  const posts = await listPublishedPosts();
  return (
    <main>
      <PageHeader
        eyebrow="Writing"
        title="Plain-language Indian legal explainers."
        description="Written for non-lawyers. Reviewed before publish. Not legal advice — consult a qualified advocate for case-specific opinion."
      />

      <section className="bg-white py-16 md:py-20">
        <div className="container max-w-3xl">
          {posts.length === 0 ? (
            <p className="rounded-2xl border border-ink-100 bg-ink-50/60 p-8 text-center text-sm text-ink-400">
              No articles published yet. Check back soon.
            </p>
          ) : (
            <ul className="divide-y divide-ink-100 border-y border-ink-100">
              {posts.map((p, i) => (
                <Reveal as="li" key={p.slug} delay={i * 0.04}>
                  <Link
                    href={`/blog/${p.slug}`}
                    className="group flex flex-col gap-3 py-7 transition-colors hover:text-ink-900"
                  >
                    <span className="text-xs uppercase tracking-wider text-ink-400">
                      {p.published_at}
                    </span>
                    <h2 className="font-serif text-2xl text-ink-900 md:text-3xl">
                      {p.title}
                    </h2>
                    <p className="text-pretty text-ink-700">{p.description}</p>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-700">
                      Read explainer
                      <ArrowUpRight
                        size={14}
                        className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </ul>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
