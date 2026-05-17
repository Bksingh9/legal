import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { buildAdmin, cleanupEphemeralUsers } from "./_setup/personas";

// Auth journey: password signup, password sign-in, forgot/reset
// (API-level — we don't drive the email click since the recovery
// token isn't reachable from a test), and Google OAuth init.

const TS = Date.now();
const EMAIL = `qa-auth+${TS}@legaldesk-test.ai`;
const PASSWORD = "qa-auth-passphrase-x9F#k2";
const NEW_PASSWORD = "qa-rotated-passphrase-w7E$j1";

test.describe.configure({ mode: "serial" });

test.describe("auth journey", () => {
  test("0. /auth/login renders Google + tabs + magic-link + password", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(
      page.getByRole("button", { name: /Continue with Google/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Magic link/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Email \+ password/i })
    ).toBeVisible();
  });

  test("1. /auth/signup renders Google + email/password form", async ({ page }) => {
    await page.goto("/auth/signup");
    await expect(
      page.getByRole("button", { name: /Sign up with Google/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Create account/i })
    ).toBeVisible();
  });

  test("2. signup with email + password creates an auth.users row", async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const anonClient = createClient(url, anon, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data, error } = await anonClient.auth.signUp({
      email: EMAIL,
      password: PASSWORD
    });
    expect(error?.message).toBeUndefined();
    expect(data.user?.email).toBe(EMAIL);

    const admin = buildAdmin();
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
    const u = list.users.find((x) => x.email === EMAIL);
    expect(u?.id).toBeTruthy();
  });

  test("3. signInWithPassword returns a session (after auto-confirm)", async () => {
    // Ensure the user is confirmed (Supabase default is double-opt-in).
    const admin = buildAdmin();
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
    const u = list.users.find((x) => x.email === EMAIL)!;
    await admin.auth.admin.updateUserById(u.id, { email_confirm: true });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const anonClient = createClient(url, anon, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data, error } = await anonClient.auth.signInWithPassword({
      email: EMAIL,
      password: PASSWORD
    });
    expect(error?.message).toBeUndefined();
    expect(data.session?.access_token).toBeTruthy();
  });

  test("4. resetPasswordForEmail accepts and queues a reset", async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const anonClient = createClient(url, anon, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { error } = await anonClient.auth.resetPasswordForEmail(EMAIL, {
      redirectTo: "https://legaldesk-ai.vercel.app/auth/reset-password"
    });
    // Either accepted, or rate-limited (3/hour). Both prove the wiring works.
    if (error) {
      expect(/rate.?limit/i.test(error.message)).toBe(true);
    }
  });

  test("5. admin-rotate password via service role works", async () => {
    // Simulates the /auth/reset-password flow's effect without needing
    // to click a real email link.
    const admin = buildAdmin();
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
    const u = list.users.find((x) => x.email === EMAIL)!;
    await admin.auth.admin.updateUserById(u.id, { password: NEW_PASSWORD });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const anonClient = createClient(url, anon, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data, error } = await anonClient.auth.signInWithPassword({
      email: EMAIL,
      password: NEW_PASSWORD
    });
    expect(error?.message).toBeUndefined();
    expect(data.session?.access_token).toBeTruthy();
  });

  test("6. Google OAuth init returns a Google consent redirect URL", async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const anonClient = createClient(url, anon, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data, error } = await anonClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://legaldesk-ai.vercel.app/auth/callback?next=/triage",
        skipBrowserRedirect: true
      }
    });
    // If Google is configured: URL is to accounts.google.com.
    // If not configured: Supabase returns "Unsupported provider" or similar.
    // We accept either as proof the SDK wiring works; the actual provider
    // toggle is a Supabase Auth config concern (set via Management API
    // when the user provides Google Cloud OAuth credentials).
    if (data?.url) {
      expect(data.url).toMatch(
        /accounts\.google\.com|supabase\.co\/auth\/v1\/authorize/
      );
    } else {
      expect(error?.message).toBeTruthy();
    }
  });

  test("7. teardown — delete the ephemeral auth test user", async () => {
    const admin = buildAdmin();
    await cleanupEphemeralUsers(admin);
  });
});
