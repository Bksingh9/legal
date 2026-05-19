import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Accessibility baseline. Runs axe-core against the major public
// surfaces; fails only on critical + serious violations (info-level
// findings are surfaced in console but don't break the build).
//
// Scope: the high-traffic, mostly-static pages. Authed flows
// (consultation room, lawyer dashboard) get a separate sweep
// once we have a deeper a11y story.

const PAGES = [
  "/",
  "/triage",
  "/documents/legal-notice",
  "/pricing",
  "/privacy",
  "/auth/login",
  "/talk-to-lawyer",
  "/for-lawyers"
];

test.describe("a11y baseline", () => {
  for (const path of PAGES) {
    test(`axe on ${path} — no critical or serious violations`, async ({ page }) => {
      await page.goto(path);
      // Wait for the page to settle — auth pages have client-side
      // hydration that can momentarily show empty form labels.
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .disableRules([
          // RapiDoc-rendered docs page uses a custom element; skip on
          // a11y test for non-canonical surfaces if/when listed.
        ])
        .analyze();

      const blocking = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious"
      );
      if (blocking.length > 0) {
        // Log the first violation in full so the failure is actionable.
        console.error(
          `[a11y] ${path} — ${blocking.length} critical/serious violations`,
          JSON.stringify(
            blocking.map((v) => ({
              id: v.id,
              impact: v.impact,
              help: v.help,
              nodes: v.nodes.slice(0, 3).map((n) => ({
                target: n.target,
                html: n.html.slice(0, 200)
              }))
            })),
            null,
            2
          )
        );
      }
      expect(blocking, `critical/serious a11y violations on ${path}`).toHaveLength(0);
    });
  }
});
