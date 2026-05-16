import { defineConfig, devices } from "@playwright/test";

// Production smoke config — runs against a live URL, no local webServer.
//
//   PROD_URL=https://legaldesk-ai.vercel.app npx playwright test --config=playwright.prod.config.ts
//
// Designed to be safe to run repeatedly against production:
// - No destructive writes beyond a single waitlist insert with a tagged email.
// - Auth-gated routes are tested for correct redirect, not driven through
//   a real magic-link click.

const BASE_URL = process.env.PROD_URL ?? "https://legaldesk-ai.vercel.app";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /production-smoke\.spec\.ts$/,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    headless: true,
    // Sandbox/CI runners may sit behind a TLS-inspecting proxy. The live
    // cert is valid; this flag just stops Chromium from rejecting it inside
    // the test harness.
    ignoreHTTPSErrors: true
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
