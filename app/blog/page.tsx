import Link from "next/link";
import { listPublishedPosts } from "@/lib/blog/loader";

export const metadata = {
  title: "Legal explainers — LegalDesk AI",
  description:
    "Plain-language explainers of common Indian legal questions: notices, agreements, complaints, RTI, family, consumer, criminal procedure."
};

export const revalidate = 3600;

export default async function BlogIndex() {
  const posts = await listPublishedPosts();
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12">
      <header>
        <p className="text-xs uppercase tracking-wide text-neutral-500">Blog</p>
        <h1 className="text-2xl font-semibold">Plain-language Indian legal explainers</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Written for non-lawyers. Reviewed before publish. Not legal advice;
          consult a qualified advocate for case-specific opinion.
        </p>
      </header>
      {posts.length === 0 ? (
        <p className="text-sm text-neutral-500">No articles published yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/blog/${p.slug}`}
                className="flex flex-col gap-1 rounded-md border border-neutral-200 p-4 hover:border-neutral-900"
              >
                <span className="text-base font-medium">{p.title}</span>
                <span className="text-sm text-neutral-600">{p.description}</span>
                <span className="text-xs text-neutral-500">{p.published_at}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
