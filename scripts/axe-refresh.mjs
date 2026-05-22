// Quick axe-core sweep across the 5 refreshed pages.
// Mirrors what tests/e2e/journey-a11y.spec.ts asserts: zero critical/serious violations.
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const PAGES = [
  "/",
  "/triage",
  "/talk-to-lawyer",
  "/lawyer/apply",
  "/pricing",
  "/documents",
  "/documents/legal-notice",
  "/for-lawyers",
  "/blog",
  "/blog/how-to-send-legal-notice-india",
  "/about",
  "/privacy",
  "/terms",
  "/refunds-cancellation",
  "/grievance",
  "/auth/login",
  "/auth/signup",
  "/auth/forgot-password"
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

let totalBlocking = 0;

for (const path of PAGES) {
  await page.goto(`http://localhost:3000${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(400);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious"
  );
  totalBlocking += blocking.length;
  const tag = blocking.length === 0 ? "✓" : "✗";
  console.log(`${tag} ${path} — ${blocking.length} critical/serious`);
  for (const v of blocking) {
    console.log(`    · ${v.id} (${v.impact}) — ${v.help}`);
    for (const n of v.nodes.slice(0, 2)) {
      console.log(`        ${n.target.join(" ")}: ${n.html.slice(0, 160)}`);
    }
  }
}

await browser.close();
console.log(`\nTotal blocking violations: ${totalBlocking}`);
process.exit(totalBlocking === 0 ? 0 : 1);
