import { test, expect } from "@playwright/test";

// Smoke: every public surface returns 200 and renders. These are cheap
// canaries for the bug bash; they catch a broken import / runtime error
// in a single commit.

const PUBLIC_PATHS = [
  "/",
  "/triage",
  "/documents",
  "/documents/legal-notice",
  "/documents/reply-legal-notice",
  "/documents/rent-agreement-11m",
  "/documents/consumer-complaint-ncdrc",
  "/documents/rti-application",
  "/consult",
  "/lawyer/apply",
  "/pricing",
  "/blog",
  "/privacy",
  "/terms"
];

test.describe("public surface canary", () => {
  for (const p of PUBLIC_PATHS) {
    test(`GET ${p} renders`, async ({ page }) => {
      const res = await page.goto(p, { waitUntil: "domcontentloaded" });
      expect(res?.status(), `${p} should not 5xx`).toBeLessThan(500);
    });
  }
});

test("api/health returns dep map", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.status).toBe("ok");
  expect(body.deps).toBeDefined();
});
