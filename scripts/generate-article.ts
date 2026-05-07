// CLI: generate a blog article frontmatter + body from a keyword.
// Run with:  npx tsx scripts/generate-article.ts "how to file an RTI"
//
// Requires ANTHROPIC_API_KEY. Produces content/blog/<slug>.md with status
// "draft"; the founder reviews and flips status to "published" before
// /blog surfaces it.

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const TRIAGE_MODEL = process.env.ANTHROPIC_TRIAGE_MODEL || "claude-sonnet-4-6";
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
    console.error("usage: generate-article.ts \"<intent keyword>\"");
    process.exit(1);
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is required");
    process.exit(2);
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": apiKey
    },
    body: JSON.stringify({
      model: TRIAGE_MODEL,
      max_tokens: 4000,
      system: [
        { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }
      ],
      messages: [{ role: "user", content: `Intent keyword: ${keyword}` }]
    })
  });
  if (!res.ok) {
    console.error("anthropic error:", res.status, await res.text());
    process.exit(3);
  }
  const data = (await res.json()) as {
    content: Array<{ type: string; text?: string }>;
  };
  const block = data.content.find((b) => b.type === "text");
  if (!block?.text) {
    console.error("empty response");
    process.exit(4);
  }
  const json = stripFences(block.text);
  const parsed = JSON.parse(json) as {
    slug: string;
    title: string;
    description: string;
    intent_keywords: string[];
    faqs: { question: string; answer: string }[];
    body_md: string;
  };

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
