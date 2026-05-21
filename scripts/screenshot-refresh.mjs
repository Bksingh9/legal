// One-off: render the 5 refreshed pages to PNG so we can review the new design.
// Run after `npm run dev` is up on localhost:3000.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const pages = [
  { url: "/", name: "01-home" },
  { url: "/triage", name: "02-triage" },
  { url: "/talk-to-lawyer", name: "03-talk-to-lawyer" },
  { url: "/lawyer/apply", name: "04-lawyer-apply" },
  { url: "/pricing", name: "05-pricing" },
  { url: "/documents", name: "06-documents" },
  { url: "/documents/legal-notice", name: "07-document-sku" },
  { url: "/for-lawyers", name: "08-for-lawyers" },
  { url: "/blog", name: "09-blog" },
  { url: "/blog/how-to-send-legal-notice-india", name: "10-blog-post" },
  { url: "/about", name: "11-about" }
];

const OUT = "test-results/refresh";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await mkdir(OUT, { recursive: true });

for (const p of pages) {
  const url = `http://localhost:3000${p.url}`;
  console.log(`→ ${url}`);
  await page.goto(url, { waitUntil: "networkidle" });
  // Scroll the page to trigger whileInView reveals, then return to top.
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    const max = document.body.scrollHeight;
    for (let y = 0; y < max; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 400));
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${p.name}.png`, fullPage: true });
}

await browser.close();
console.log("done");
