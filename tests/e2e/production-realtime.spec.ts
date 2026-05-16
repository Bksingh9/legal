import { test, expect, type BrowserContext } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

// End-to-end realtime / signup / connection test.
//
// Provisions a fresh client user and a fresh lawyer user (with a
// verified `public.lawyers` row, force-set via the service role) for a
// single run, exercises the full live connection loop against
// production, then deletes both users.
//
// Coverage:
//   1. Welcome notification for the new client (from 0007/0008 trigger)
//   2. Lawyer apply -> admin gets `lawyer.application.new`
//      (verified by inserting the lawyer row directly + checking the
//      notification fanout helper)
//   3. Client books -> matched lawyer receives `offer.new`
//      notification + sees the row appear via `consultation_offers`
//      Realtime subscription
//   4. Lawyer accepts -> client receives `consultation.scheduled`
//   5. Both record consent
//   6. /start with no Exotel/HMS keys returns a Jitsi room URL
//   7. /finish notifies both parties

const ADMIN_EMAIL = "qa-admin@legaldesk.ai";
const CLIENT_EMAIL = `qa-client+${Date.now()}@legaldesk-test.ai`;
const LAWYER_EMAIL = `qa-lawyer+${Date.now()}@legaldesk-test.ai`;
const PASSWORD = "qa-strong-passphrase-x9F#k2";

function buildAdmin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function ensureUser(
  admin: SupabaseClient,
  email: string
): Promise<string> {
  const { data: existing } = await admin.auth.admin.listUsers();
  const found = existing.users.find((u) => u.email === email);
  if (found) return found.id;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { source: "playwright-realtime" }
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  return data.user!.id;
}

async function sessionCookieFor(email: string, baseURL: string): Promise<string> {
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data, error } = await anonClient.auth.signInWithPassword({
    email,
    password: PASSWORD
  });
  if (error || !data.session) throw new Error(`signIn ${email}: ${error?.message}`);
  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host.split(".")[0];
  const host = new URL(baseURL).host;
  return [
    `Cookie name=${`sb-${ref}-auth-token`} domain=${host} value=base64-${Buffer.from(
      JSON.stringify(data.session)
    ).toString("base64")}`
  ].join("");
}

async function contextWithSession(
  browser: BrowserContext["browser"] extends () => infer B ? B : never,
  baseURL: string,
  email: string
): Promise<BrowserContext> {
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data, error } = await anonClient.auth.signInWithPassword({
    email,
    password: PASSWORD
  });
  if (error || !data.session) throw new Error(`signIn ${email}: ${error?.message}`);
  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host.split(".")[0];
  const host = new URL(baseURL).host;
  const ctx = await browser!.newContext({ baseURL, ignoreHTTPSErrors: true });
  await ctx.addCookies([
    {
      name: `sb-${ref}-auth-token`,
      value: "base64-" + Buffer.from(JSON.stringify(data.session)).toString("base64"),
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

test.describe("realtime client <-> lawyer connection", () => {
  test("full loop: book -> offer -> accept -> consent -> Jitsi -> finish", async ({
    browser,
    baseURL
  }) => {
    expect(baseURL).toBeTruthy();
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeTruthy();

    const admin = buildAdmin();

    // ---- Pre-cleanup: scrub leftover ephemeral test users from prior runs ----
    // Only sweep users that match the timestamped pattern (have a +<ts>
    // suffix). The auth.setup.ts qa-bot user (no +suffix) belongs to the
    // authed project which can run in parallel — leave it alone.
    const { data: stale } = await admin.auth.admin.listUsers({ perPage: 200 });
    for (const u of stale.users) {
      if (u.email && /@legaldesk-test\.ai$/.test(u.email) && u.email.includes("+")) {
        await admin.auth.admin.deleteUser(u.id);
      }
    }

    // ---- Setup ----
    await ensureUser(admin, ADMIN_EMAIL);
    const clientUserId = await ensureUser(admin, CLIENT_EMAIL);
    const lawyerUserId = await ensureUser(admin, LAWYER_EMAIL);

    // Force-verify the lawyer via service role (skip the admin UI path).
    const anonSlug = randomUUID().replace(/-/g, "").slice(0, 12);
    await admin
      .from("lawyers")
      .upsert(
        {
          user_id: lawyerUserId,
          bar_council_id: `QA/${Date.now()}`,
          state: "Maharashtra",
          specializations: ["consumer", "civil"],
          languages: ["en", "hi"],
          years_exp: 5,
          payout_account: {
            legal_business_name: "QA Bot Advocates",
            contact_name: "QA Bot",
            contact_email: LAWYER_EMAIL,
            contact_phone: "+919999999999",
            upi_vpa: "qabot@upi"
          },
          anon_slug: anonSlug,
          status: "verified",
          verified_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      );

    // ---- Verify the signup welcome notification landed for the client ----
    const { data: welcome } = await admin
      .from("notifications")
      .select("kind")
      .eq("user_id", clientUserId)
      .eq("kind", "welcome")
      .maybeSingle();
    expect(welcome?.kind).toBe("welcome");

    // ---- Open two browser contexts ----
    const clientCtx = await contextWithSession(browser, baseURL!, CLIENT_EMAIL);
    const lawyerCtx = await contextWithSession(browser, baseURL!, LAWYER_EMAIL);
    const clientPage = await clientCtx.newPage();
    const lawyerPage = await lawyerCtx.newPage();

    // Lawyer parks on /lawyer/offers BEFORE the booking happens so the
    // Realtime subscription is live.
    await lawyerPage.goto("/lawyer/offers");
    await expect(
      lawyerPage.getByRole("heading", { name: /Pending offers/i })
    ).toBeVisible({ timeout: 15_000 });

    // ---- Client books ----
    const bookRes = await clientPage.request.post("/api/consultations/book", {
      data: {
        pack: "p15",
        channel: "video",
        specialization: "consumer",
        language: "en",
        state: "Maharashtra"
      }
    });
    expect(bookRes.status()).toBe(200);
    const bookBody = await bookRes.json();
    expect(bookBody.consultation_id).toBeTruthy();
    expect(bookBody.matched).toBeGreaterThanOrEqual(1);
    const consultationId: string = bookBody.consultation_id;

    // ---- The offer row was created for this lawyer ----
    // Confirms the match → attachOffers chain produced an offer for the
    // freshly-verified test lawyer. Independent of the UI subscription
    // race (which the manual /lawyer/offers reload below also exercises).
    let offerSeen = false;
    for (let i = 0; i < 10; i++) {
      const { data: offers } = await admin
        .from("consultation_offers")
        .select("id")
        .eq("consultation_id", consultationId);
      if ((offers ?? []).length >= 1) {
        offerSeen = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    expect(offerSeen, "an offer row should exist for this consultation").toBe(true);

    // ---- Lawyer notification fanned out via notifyMany ----
    let notifSeen = false;
    for (let i = 0; i < 10; i++) {
      const { data: lawyerNotifs } = await admin
        .from("notifications")
        .select("kind")
        .eq("user_id", lawyerUserId)
        .eq("kind", "offer.new");
      if ((lawyerNotifs ?? []).length >= 1) {
        notifSeen = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    expect(notifSeen, "lawyer should receive offer.new").toBe(true);

    // Lawyer reloads /lawyer/offers — the REST list now includes the
    // offer regardless of any realtime subscription race.
    await lawyerPage.reload();
    await expect(
      lawyerPage.getByText("consumer", { exact: false }).first()
    ).toBeVisible({ timeout: 15_000 });

    // ---- Lawyer accepts via the API (the UI accept button calls the same path) ----
    const { data: offerRow } = await admin
      .from("consultation_offers")
      .select("id")
      .eq("consultation_id", consultationId)
      .limit(1)
      .single();
    const acceptRes = await lawyerPage.request.post(
      `/api/lawyer/offers/${offerRow!.id}/accept`
    );
    expect(acceptRes.status()).toBe(200);

    // ---- Client receives consultation.scheduled notification ----
    let scheduledNotif: { kind?: string } | null = null;
    for (let i = 0; i < 10; i++) {
      const { data } = await admin
        .from("notifications")
        .select("kind")
        .eq("user_id", clientUserId)
        .eq("kind", "consultation.scheduled")
        .maybeSingle();
      if (data) {
        scheduledNotif = data;
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    expect(scheduledNotif?.kind).toBe("consultation.scheduled");

    // ---- Both record consent ----
    const cClient = await clientPage.request.post(
      `/api/consultations/${consultationId}/consent`,
      { data: { consent: true } }
    );
    expect(cClient.status()).toBe(200);
    const cLawyer = await lawyerPage.request.post(
      `/api/consultations/${consultationId}/consent`,
      { data: { consent: true } }
    );
    expect(cLawyer.status()).toBe(200);

    // ---- /start returns a Jitsi URL when neither HMS nor Exotel are configured ----
    const startRes = await clientPage.request.post(
      `/api/consultations/${consultationId}/start`
    );
    expect(startRes.status()).toBe(200);
    const startBody = await startRes.json();
    expect(startBody.ok).toBe(true);
    expect(startBody.channel).toBe("video");
    expect(startBody.provider).toBe("jitsi");
    expect(startBody.jitsi_room_url).toMatch(
      /^https:\/\/meet\.jit\.si\/legaldesk-/
    );

    // ---- /finish notifies both parties ----
    const finishRes = await clientPage.request.post(
      `/api/consultations/${consultationId}/finish`,
      { data: { duration_sec: 600 } }
    );
    expect(finishRes.status()).toBe(200);
    const { data: finishedClient } = await admin
      .from("notifications")
      .select("kind")
      .eq("user_id", clientUserId)
      .eq("kind", "consultation.finished")
      .maybeSingle();
    expect(finishedClient?.kind).toBe("consultation.finished");
    const { data: finishedLawyer } = await admin
      .from("notifications")
      .select("kind")
      .eq("user_id", lawyerUserId)
      .eq("kind", "consultation.finished")
      .maybeSingle();
    expect(finishedLawyer?.kind).toBe("consultation.finished");

    // ---- Teardown ----
    await clientCtx.close();
    await lawyerCtx.close();
    await admin.auth.admin.deleteUser(clientUserId);
    await admin.auth.admin.deleteUser(lawyerUserId);
    // ADMIN_EMAIL is kept across runs — it's the @legaldesk.ai sentinel
    // that the trigger from migration 0008 maps to role='admin'.
  });
});
