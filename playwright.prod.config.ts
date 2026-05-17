import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

// Production smoke config — runs against a live URL, no local webServer.
//
//   PROD_URL=https://legaldesk-ai.vercel.app \
//   NEXT_PUBLIC_SUPABASE_URL=... \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   npx playwright test --config=playwright.prod.config.ts

const BASE_URL = process.env.PROD_URL ?? "https://legaldesk-ai.vercel.app";
const STORAGE = path.join(__dirname, "tests/e2e/_setup/storage.json");

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    headless: true,
    ignoreHTTPSErrors: true
  },
  projects: [
    {
      name: "setup",
      testMatch: /_setup\/auth\.setup\.ts$/
    },
    {
      name: "anonymous",
      testMatch: /production-smoke\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "anonymous-firefox",
      testMatch: /production-smoke\.spec\.ts$/,
      use: { ...devices["Desktop Firefox"] }
    },
    {
      name: "authed",
      testMatch: /production-authed\.spec\.ts$/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: STORAGE
      }
    },
    {
      name: "realtime",
      testMatch: /production-realtime\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "journey-customer",
      testMatch: /journey-customer\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "journey-lawyer",
      testMatch: /journey-lawyer\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "journey-admin",
      testMatch: /journey-admin\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "teardown",
      testMatch: /_setup\/auth\.teardown\.ts$/,
      dependencies: ["authed"]
    }
  ]
});
