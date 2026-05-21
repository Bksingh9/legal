import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { listPublishedPosts, getPostBySlug } from "@/lib/blog/loader";
import { renderMarkdown } from "@/lib/blog/markdown";
import { TRIAGE_DISCLAIMER } from "@/lib/anthropic/prompts";
import { PageHeader } from "@/components/landing/page-header";
import { SiteFooter } from "@/components/landing/site-footer";

export const revalidate = 3600;

export async function generateStaticParams() {
  const posts = await listPublishedPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);
  if (!post) return {};
  return {
    title: `${post.title} — LegalDesk AI`,
    description: post.description
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);
  if (!post || (post.status ?? "published") !== "published") notFound();

  const html = renderMarkdown(post.body_md);
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.published_at,
    author: { "@type": "Organization", name: "LegalDesk AI Team" },
    publisher: { "@type": "Organization", name: "LegalDesk AI" }
  };
  const faqSchema = post.faqs.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: post.faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer }
        }))
      }
    : null;

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {faqSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      ) : null}

      <PageHeader eyebrow={`Explainer · ${post.published_at}`} title={post.title} description={post.description} />

      <section className="bg-white py-16 md:py-20">
        <div className="container max-w-2xl">
          <Link
            href="/blog"
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-ink-700 transition-colors hover:text-ink-900"
          >
            <ArrowLeft size={14} />
            All explainers
          </Link>

          <article
            className="flex flex-col gap-5 text-pretty text-base leading-[1.75] text-ink-700 [&_a]:text-brand-700 [&_a]:underline-offset-4 hover:[&_a]:underline [&_h2]:mt-10 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-ink-900 [&_h3]:mt-6 [&_h3]:font-medium [&_h3]:text-lg [&_h3]:text-ink-900 [&_li]:my-1 [&_ol]:my-2 [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:text-ink-700 [&_strong]:font-medium [&_strong]:text-ink-900 [&_ul]:my-2 [&_ul]:ml-5 [&_ul]:list-disc"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {post.faqs.length > 0 ? (
            <section className="mt-16 border-t border-ink-100 pt-10">
              <h2 className="font-serif text-3xl text-ink-900">Frequently asked</h2>
              <div className="mt-6 divide-y divide-ink-100 border-y border-ink-100">
                {post.faqs.map((f) => (
                  <details key={f.question} className="group py-5">
                    <summary className="cursor-pointer list-none text-base font-medium text-ink-900 marker:hidden">
                      <span className="flex items-center justify-between">
                        {f.question}
                        <span className="text-ink-400 transition-transform group-open:rotate-45">
                          +
                        </span>
                      </span>
                    </summary>
                    <p className="mt-3 text-pretty text-ink-700">{f.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          ) : null}

          <div className="mt-12 rounded-2xl border border-accent-200 bg-accent-50 p-5 text-sm text-ink-900">
            <p className="font-medium">Not legal advice</p>
            <p className="mt-1 text-ink-700">{TRIAGE_DISCLAIMER}</p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
