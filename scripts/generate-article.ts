// CLI: generate a blog article frontmatter + body from a keyword.
// Run with:  npx tsx scripts/generate-article.ts "how to file an RTI"
//
// Uses the LLM router (lib/llm/router.ts). The backend is selected by
// LLM_BLOG (anthropic / openai / ollama / openrouter / sarvam / mock).
// When LLM_BLOG is unset, the router falls through to whichever provider
// has its API key configured, ending at the mock provider so the CLI
// always produces output. Set LLM_BLOG=ollama for local generation
// against a self-hosted Llama 3.1 — zero API spend.

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { generate, pickProvider } from "../lib/llm/router";

const SYSTEM = `You are LegalDesk AI's content writer. From a single intent
keyword, produce a publishable explainer for non-lawyers in India.

Output strict JSON with this exact shape:
{
  "slug": kebab-case-string-of-the-title,
  "title": string,
  "description": string,                  // <= 160 chars
  "intent_keywords": [string, ...],       // 3-6 items
  "faqs": [{"question": string, "answer": string}, ...],  // 3-6 items
  "body_md": string                       // markdown, h2/h3/lists/paragraphs
}

Rules:
- Indian law only. Cite Acts and section numbers (e.g. "Consumer
  Protection Act 2019, Section 35"). NEVER cite case names, judges, or
  judgments.
- NEVER name a lawyer, advocate, judge, or any individual.
- Plain language for a non-lawyer. Practical step-by-step where possible.
- 600-1100 words in body_md.
- Each FAQ answer 2-4 sentences.
- Output the JSON object only. No prose around it. No code fences.`;

async function main() {
  const keyword = process.argv.slice(2).join(" ").trim();
  if (!keyword) {
    console.error('usage: generate-article.ts "<intent keyword>"');
    process.exit(1);
  }

  const provider = pickProvider("blog.generate");
  console.error(`[generate-article] provider=${provider.name}`);

  const result = await generate({
    workload: "blog.generate",
    system: SYSTEM,
    user: `Intent keyword: ${keyword}`,
    max_tokens: 4000
  });

  let parsed: {
    slug: string;
    title: string;
    description: string;
    intent_keywords: string[];
    faqs: { question: string; answer: string }[];
    body_md: string;
  };
  try {
    parsed = JSON.parse(stripFences(result.text));
  } catch (err) {
    console.error("could not parse LLM output as JSON:", err);
    console.error("raw:", result.text.slice(0, 400));
    process.exit(3);
  }

  const today = new Date().toISOString().slice(0, 10);
  const frontmatter = JSON.stringify(
    {
      slug: parsed.slug,
      title: parsed.title,
      description: parsed.description,
      intent_keywords: parsed.intent_keywords,
      published_at: today,
      status: "draft",
      faqs: parsed.faqs
    },
    null,
    2
  );
  const md = `---\n${frontmatter}\n---\n\n${parsed.body_md.trim()}\n`;

  const outDir = path.join(process.cwd(), "content", "blog");
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `${parsed.slug}.md`);
  await writeFile(outPath, md, "utf-8");
  console.log(`wrote ${outPath}`);
}

function stripFences(s: string): string {
  return s
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
