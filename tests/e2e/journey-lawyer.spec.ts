import { test, expect } from "@playwright/test";
import {
  buildAdmin,
  contextForUser,
  provisionUser,
  cleanupEphemeralUsers
} from "./_setup/personas";

// Lawyer journey end-to-end against the live deploy.
// Anonymous: /for-lawyers landing → /lawyer/apply form submit (creates
// auth user). Service-role: verify the lawyer. Then a separate client
// books a matching consultation; the lawyer sees the offer, accepts,
// gets a wa.me click-to-message link.

const TS = Date.now();
const LAWYER_EMAIL = `qa-lawyer+${TS}@legaldesk-test.ai`;
const CLIENT_EMAIL = `qa-client+${TS}@legaldesk-test.ai`;

test.describe.configure({ mode: "serial" });

test.describe("lawyer journey", () => {
  let lawyerUserId: string | null = null;
  let lawyerRowId: string | null = null;
  let consultationId: string | null = null;

  test("1. /for-lawyers landing renders the apply CTA", async ({ page }) => {
    await page.goto("/for-lawyers");
    await expect(
      page.getByRole("link", { name: /Apply now/i }).first()
    ).toBeVisible();
  });

  test("2. /lawyer/apply is public (no auth wall)", async ({ page }) => {
    await page.goto("/lawyer/apply");
    await expect(page.getByText(/Bar Council ID/i).first()).toBeVisible();
    await expect(page.getByText(/Hours per week/i).first()).toBeVisible();
  });

  test("3. anonymous apply submission provisions the lawyer", async ({
    request
  }) => {
    const res = await request.post("/api/lawyer/apply", {
      data: {
        bar_council_id: `QA/JL/${TS}`,
        state: "Maharashtra",
        years_exp: 7,
        specializations: ["consumer", "civil"],
        languages: ["en", "hi"],
        hours_per_week: 10,
        availability_note: "Mon-Fri 7-10pm",
        payout: {
          legal_business_name: "QA Bot Advocates",
          contact_name: "QA Bot",
          contact_email: LAWYER_EMAIL,
          contact_phone: "+919999900002",
          upi_vpa: "qabot@upi"
        }
      }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.anon_slug).toMatch(/^[0-9a-f]{8,}$/);
    expect(body.status).toBe("pending");
  });

  test("4. service-role: lawyer row has the new availability fields", async () => {
    const admin = buildAdmin();
    const { data: u } = await admin.auth.admin.listUsers({ perPage: 200 });
    const user = u.users.find((x) => x.email === LAWYER_EMAIL);
    expect(user?.id).toBeTruthy();
    lawyerUserId = user!.id;

    // The /api/lawyer/apply path creates the user without a password
    // (magic-link only). Set a known password now so subsequent steps
    // can sign in via password.
    await admin.auth.admin.updateUserById(lawyerUserId, {
      password: "qa-strong-passphrase-x9F#k2",
      email_confirm: true
    });

    const { data: lawyer } = await admin
      .from("lawyers")
      .select("id, status, hours_per_week, notification_email")
      .eq("user_id", lawyerUserId)
      .maybeSingle();
    expect(lawyer?.status).toBe("pending");
    expect(lawyer?.hours_per_week).toBe(10);
    expect(lawyer?.notification_email).toBe(LAWYER_EMAIL);
    lawyerRowId = lawyer!.id;
  });

  test("5. flip the lawyer to verified (covered by admin journey separately)", async () => {
    const admin = buildAdmin();
    await admin
      .from("lawyers")
      .update({ status: "verified", verified_at: new Date().toISOString() })
      .eq("id", lawyerRowId!);
    const { data: verified } = await admin
      .from("lawyers")
      .select("status")
      .eq("id", lawyerRowId!)
      .maybeSingle();
    expect(verified?.status).toBe("verified");
  });

  test("6. provision a client + book a matching consultation", async ({
    browser,
    baseURL
  }) => {
    const admin = buildAdmin();
    // Clean other ephemeral lawyers first so the match goes to ours.
    await cleanupOtherVerifiedLawyers(admin, lawyerRowId!);
    await provisionUser(admin, CLIENT_EMAIL);
    const ctx = await contextForUser(browser, baseURL!, CLIENT_EMAIL);
    const page = await ctx.newPage();
    const res = await page.request.post("/api/consultations/book", {
      data: {
        pack: "p15",
        channel: "video",
        specialization: "consumer",
        language: "en",
        state: "Maharashtra"
      }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.matched).toBeGreaterThanOrEqual(1);
    consultationId = body.consultation_id;
    await ctx.close();
  });

  test("7. lawyer receives the offer.new notification", async () => {
    const admin = buildAdmin();
    let seen = false;
    for (let i = 0; i < 10; i++) {
      const { data: notifs } = await admin
        .from("notifications")
        .select("kind")
        .eq("user_id", lawyerUserId!)
        .eq("kind", "offer.new");
      if ((notifs ?? []).length >= 1) {
        seen = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    expect(seen).toBe(true);
  });

  test("8. lawyer sees pending offer in /lawyer/offers", async ({
    browser,
    baseURL
  }) => {
    const ctx = await contextForUser(browser, baseURL!, LAWYER_EMAIL);
    const page = await ctx.newPage();
    await page.goto("/lawyer/offers");
    await expect(
      page.getByRole("heading", { name: /Pending offers/i })
    ).toBeVisible({ timeout: 15_000 });
    await ctx.close();
  });

  let offerId: string | null = null;
  test("9. offer row exists for this lawyer", async () => {
    const admin = buildAdmin();
    const { data: offer } = await admin
      .from("consultation_offers")
      .select("id")
      .eq("consultation_id", consultationId!)
      .eq("lawyer_id", lawyerRowId!)
      .maybeSingle();
    expect(offer?.id).toBeTruthy();
    offerId = offer!.id;
  });

  test("10. accept returns a wa.me click-to-message link", async ({
    browser,
    baseURL
  }) => {
    const ctx = await contextForUser(browser, baseURL!, LAWYER_EMAIL);
    const page = await ctx.newPage();
    const res = await page.request.post(`/api/lawyer/offers/${offerId}/accept`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.consultation_id).toBe(consultationId);
    expect(typeof body.client_whatsapp_link).toBe("string");
    expect(body.client_whatsapp_link).toMatch(/^https:\/\/wa\.me\/\d{7,15}\?text=/);
    await ctx.close();
  });

  test("11. lawyer can open the /consultations/[id] waiting room", async ({
    browser,
    baseURL
  }) => {
    const ctx = await contextForUser(browser, baseURL!, LAWYER_EMAIL);
    const page = await ctx.newPage();
    await page.goto(`/consultations/${consultationId}`);
    await expect(
      page.getByRole("heading", { name: /waiting room/i })
    ).toBeVisible({ timeout: 15_000 });
    await ctx.close();
  });

  test("12. teardown — delete ephemeral users", async () => {
    const admin = buildAdmin();
    await cleanupEphemeralUsers(admin);
  });
});

async function cleanupOtherVerifiedLawyers(
  admin: ReturnType<typeof buildAdmin>,
  keepId: string
): Promise<void> {
  const { data: lawyers } = await admin
    .from("lawyers")
    .select("id, user_id")
    .eq("status", "verified");
  for (const l of lawyers ?? []) {
    if (l.id === keepId) continue;
    // Cascade-delete via the user row.
    await admin.auth.admin.deleteUser(l.user_id as string).catch(() => {});
  }
}
