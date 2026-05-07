import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { BlogPost, BlogFrontmatter } from "./types";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export async function listPublishedPosts(): Promise<BlogPost[]> {
  const all = await listAllPosts();
  return all
    .filter((p) => (p.status ?? "published") === "published")
    .sort((a, b) => b.published_at.localeCompare(a.published_at));
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const all = await listAllPosts();
  const post = all.find((p) => p.slug === slug);
  return post ?? null;
}

async function listAllPosts(): Promise<BlogPost[]> {
  let files: string[];
  try {
    files = (await readdir(BLOG_DIR)).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }

  const out: BlogPost[] = [];
  for (const f of files) {
    const raw = await readFile(path.join(BLOG_DIR, f), "utf-8");
    const post = parseFrontmatter(raw);
    if (post) out.push(post);
  }
  return out;
}

// Minimal frontmatter parser. Top-of-file delimited by `---` ... `---` lines
// containing a JSON object. Keeps the build dependency-free.
function parseFrontmatter(raw: string): BlogPost | null {
  const m = /^---\n([\s\S]+?)\n---\n([\s\S]*)$/m.exec(raw.trim());
  if (!m) return null;
  let fm: BlogFrontmatter;
  try {
    fm = JSON.parse(m[1]) as BlogFrontmatter;
  } catch {
    return null;
  }
  return { ...fm, body_md: m[2].trim() };
}
