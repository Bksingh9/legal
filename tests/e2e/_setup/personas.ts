import { type Browser, type BrowserContext } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Shared helpers for the persona-journey specs. Each spec provisions
// its own ephemeral users with timestamped emails so concurrent runs
// don't collide; this helper centralises the patterns extracted from
// production-realtime.spec.ts.

export const TEST_PASSWORD = "qa-strong-passphrase-x9F#k2";

export function buildAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sr = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !sr) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }
  return createClient(url, sr, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// Deterministic per-email phone so the public.users row gets populated
// (notifications need it for wa.me hand-off).
function phoneFor(email: string): string {
  let hash = 0;
  for (const c of email) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return "+91" + (9000000000 + (hash % 999999999)).toString();
}

export async function provisionUser(
  admin: SupabaseClient,
  email: string
): Promise<string> {
  const phone = phoneFor(email);
  const { data: existing } = await admin.auth.admin.listUsers({ perPage: 200 });
  const found = existing.users.find((u) => u.email === email);
  if (found) {
    await admin.auth.admin.updateUserById(found.id, {
      password: TEST_PASSWORD,
      email_confirm: true
    });
    await admin.from("users").update({ phone }).eq("id", found.id);
    return found.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { source: "playwright-journey" }
  });
  if (error || !data.user) {
    throw new Error(`createUser ${email}: ${error?.message}`);
  }
  // 0007 trigger inserted the public.users row; backfill the phone.
  await admin.from("users").update({ phone }).eq("id", data.user.id);
  return data.user.id;
}

// Build a browser context with the Supabase SSR auth cookie set so the
// session is recognised by the server on first navigation.
export async function contextForUser(
  browser: Browser,
  baseURL: string,
  email: string
): Promise<BrowserContext> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const anonClient = createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data, error } = await anonClient.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD
  });
  if (error || !data.session) {
    throw new Error(`signIn ${email}: ${error?.message}`);
  }
  const ref = new URL(url).host.split(".")[0];
  const host = new URL(baseURL).host;
  const ctx = await browser.newContext({ baseURL, ignoreHTTPSErrors: true });
  await ctx.addCookies([
    {
      name: `sb-${ref}-auth-token`,
      value:
        "base64-" + Buffer.from(JSON.stringify(data.session)).toString("base64"),
      domain: host,
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + 60 * 60
    }
  ]);
  return ctx;
}

// Bulk-delete every test user whose email ends with @legaldesk-test.ai
// AND contains a "+" (matches our ephemeral pattern; leaves the
// persistent qa-bot / qa-admin accounts in place). Cascade-deletes
// every dependent row.
export async function cleanupEphemeralUsers(
  admin: SupabaseClient
): Promise<number> {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
  let n = 0;
  for (const u of list.users) {
    if (
      u.email &&
      /@legaldesk-test\.ai$/.test(u.email) &&
      u.email.includes("+")
    ) {
      await admin.auth.admin.deleteUser(u.id);
      n++;
    }
  }
  return n;
}
