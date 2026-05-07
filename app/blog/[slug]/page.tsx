import { notFound } from "next/navigation";
import { listPublishedPosts, getPostBySlug } from "@/lib/blog/loader";
import { renderMarkdown } from "@/lib/blog/markdown";
import { TRIAGE_DISCLAIMER } from "@/lib/anthropic/prompts";

export const revalidate = 3600;

export async function generateStaticParams() {
  const posts = await listPublishedPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params
}: {
  params: { slug: string };
}) {
  const post = await getPostBySlug(params.slug);
  if (!post) return {};
  return {
    title: `${post.title} — LegalDesk AI`,
    description: post.description
  };
}

export default async function BlogPostPage({
  params
}: {
  params: { slug: string };
}) {
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
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12">
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

      <header>
        <p className="text-xs uppercase tracking-wide text-neutral-500">Explainer</p>
        <h1 className="text-2xl font-semibold">{post.title}</h1>
        <p className="mt-1 text-xs text-neutral-500">{post.published_at}</p>
      </header>

      <article
        className="prose-li flex flex-col gap-4 text-sm leading-relaxed [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:font-semibold [&_p]:text-neutral-800 [&_ol]:ml-5 [&_ol]:list-decimal [&_ul]:ml-5 [&_ul]:list-disc"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {post.faqs.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">FAQ</h2>
          {post.faqs.map((f) => (
            <details key={f.question} className="rounded-md border border-neutral-200 p-3">
              <summary className="cursor-pointer text-sm font-medium">{f.question}</summary>
              <p className="mt-2 text-sm text-neutral-700">{f.answer}</p>
            </details>
          ))}
        </section>
      ) : null}

      <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
        {TRIAGE_DISCLAIMER}
      </p>
    </main>
  );
}
