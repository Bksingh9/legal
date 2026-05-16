import { test as setup, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

// Provisions a deterministic test user via Supabase admin (service role),
// signs them in by injecting a real session into Playwright's cookies,
// and saves storage state for the authed project to reuse.
//
// We bypass the email round-trip by:
//   1. createUser({ email_confirm: true, password })
//   2. signInWithPassword via the anon client to get a real session
//   3. Inject the session JSON as the Supabase SSR cookie
//
// The teardown deletes the user so the prod DB doesn't accumulate.

const TEST_EMAIL = "qa-bot@legaldesk-test.ai";
const TEST_PASSWORD = "qa-bot-strong-passphrase-x9F#k2";
const STORAGE_PATH = path.join(process.cwd(), "tests/e2e/_setup/storage.json");

setup("authenticate via admin-issued session", async ({ playwright, baseURL, request }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  expect(url, "NEXT_PUBLIC_SUPABASE_URL must be set").toBeTruthy();
  expect(anon, "NEXT_PUBLIC_SUPABASE_ANON_KEY must be set").toBeTruthy();
  expect(serviceRole, "SUPABASE_SERVICE_ROLE_KEY must be set").toBeTruthy();
  expect(baseURL, "baseURL must be set").toBeTruthy();

  const admin = createClient(url!, serviceRole!, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { error: createErr } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { source: "playwright-prod-smoke" }
  });
  if (createErr && !/registered|exists/i.test(createErr.message)) {
    throw new Error(`createUser failed: ${createErr.message}`);
  }

  // If the user already exists from a previous (failed) run, make sure
  // the password we know about is the active one.
  if (createErr) {
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list.users.find((u) => u.email === TEST_EMAIL);
    if (existing) {
      await admin.auth.admin.updateUserById(existing.id, {
        password: TEST_PASSWORD,
        email_confirm: true
      });
    }
  }

  const anonClient = createClient(url!, anon!, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data: signIn, error: signErr } = await anonClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });
  if (signErr || !signIn.session) {
    throw new Error(`signInWithPassword failed: ${signErr?.message ?? "no session"}`);
  }

  // Supabase SSR stores the session under `sb-<projectRef>-auth-token`.
  const projectRef = new URL(url!).host.split(".")[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  const cookieValue =
    "base64-" + Buffer.from(JSON.stringify(signIn.session)).toString("base64");

  const host = new URL(baseURL!).host;
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({ baseURL, ignoreHTTPSErrors: true });
  await context.addCookies([
    {
      name: cookieName,
      value: cookieValue,
      domain: host,
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + 60 * 60
    }
  ]);

  // Verify the cookie actually authenticates by hitting an authed
  // endpoint and asserting a non-401 response. The exact shape varies
  // per endpoint; auth status is what we care about here.
  const verifyPage = await context.newPage();
  const probe = await verifyPage.request.get("/api/dpdp/export");
  expect(
    probe.status(),
    "DPDP export should return 200 with valid session"
  ).toBe(200);
  const body = await probe.json();
  expect(body?.ok).toBe(true);

  fs.mkdirSync(path.dirname(STORAGE_PATH), { recursive: true });
  await context.storageState({ path: STORAGE_PATH });
  await browser.close();
});
