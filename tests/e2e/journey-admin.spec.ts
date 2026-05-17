import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
import {
  buildAdmin,
  contextForUser,
  provisionUser,
  cleanupEphemeralUsers
} from "./_setup/personas";

// Admin journey end-to-end against the live deploy.
// Provisions a pending lawyer, a consultation lead, and a UPI payment
// in pending_verification. Signs in as an @legaldesk.ai admin (which
// the 0007 trigger auto-assigns role='admin' to) and walks the three
// admin queues: lawyers, leads, payments.

const TS = Date.now();
const ADMIN_EMAIL = "qa-admin@legaldesk.ai"; // persistent — role auto-set
const APPLICANT_EMAIL = `qa-applicant+${TS}@legaldesk-test.ai`;
const PAYER_EMAIL = `qa-payer+${TS}@legaldesk-test.ai`;

test.describe.configure({ mode: "serial" });

test.describe("admin journey", () => {
  let pendingLawyerId: string | null = null;
  let leadId: string | null = null;
  let pendingPaymentId: string | null = null;
  let applicantUserId: string | null = null;
  let payerUserId: string | null = null;

  test("0. ensure persistent admin user exists", async () => {
    const admin = buildAdmin();
    await provisionUser(admin, ADMIN_EMAIL);
    const { data: u } = await admin
      .from("users")
      .select("role")
      .eq("email", ADMIN_EMAIL)
      .maybeSingle();
    expect(u?.role).toBe("admin");
  });

  test("1. provision pre-state: pending lawyer, lead, pending payment", async () => {
    const admin = buildAdmin();

    // Pending lawyer
    applicantUserId = await provisionUser(admin, APPLICANT_EMAIL);
    const { data: lawyer } = await admin
      .from("lawyers")
      .upsert(
        {
          user_id: applicantUserId,
          bar_council_id: `QA/JA/${TS}`,
          state: "Karnataka",
          specializations: ["consumer"],
          languages: ["en"],
          years_exp: 3,
          hours_per_week: 5,
          payout_account: {
            legal_business_name: "QA Applicant",
            contact_name: "QA Applicant",
            contact_email: APPLICANT_EMAIL,
            contact_phone: "+919999900003",
            upi_vpa: "qa@upi"
          },
          notification_email: APPLICANT_EMAIL,
          anon_slug: randomBytes(6).toString("hex"),
          status: "pending"
        },
        { onConflict: "user_id" }
      )
      .select("id")
      .single();
    pendingLawyerId = lawyer!.id;

    // Lead
    const { data: lead } = await admin
      .from("consultation_leads")
      .insert({
        name: `QA Lead ${TS}`,
        phone: "+919999900004",
        issue:
          "Need help drafting a legal notice for an unpaid contract amount of Rs 2 lakh.",
        status: "new"
      })
      .select("id")
      .single();
    leadId = lead!.id;

    // Pending UPI payment
    payerUserId = await provisionUser(admin, PAYER_EMAIL);
    const { data: payment } = await admin
      .from("payments")
      .insert({
        user_id: payerUserId,
        method: "upi",
        amount: 19900,
        status: "pending_verification",
        sku: "consultation",
        idempotency_key: `qa-pay-${TS}`,
        upi_vpa: "legaldesk@upi",
        upi_utr: `QATEST${TS}`,
        upi_submitted_at: new Date().toISOString()
      })
      .select("id")
      .single();
    pendingPaymentId = payment!.id;
  });

  test("2. admin sees pending lawyer in /admin/lawyers queue", async ({
    browser,
    baseURL
  }) => {
    const ctx = await contextForUser(browser, baseURL!, ADMIN_EMAIL);
    const page = await ctx.newPage();
    const res = await page.request.get("/api/admin/lawyers");
    expect(res.status()).toBe(200);
    const body = await res.json();
    const ids = (body.items ?? body.lawyers ?? []).map(
      (l: { id: string }) => l.id
    );
    expect(ids).toContain(pendingLawyerId);
    await ctx.close();
  });

  test("3. admin verifies the lawyer and lawyer gets notification", async ({
    browser,
    baseURL
  }) => {
    const ctx = await contextForUser(browser, baseURL!, ADMIN_EMAIL);
    const page = await ctx.newPage();
    const res = await page.request.post(
      `/api/admin/lawyers/${pendingLawyerId}/verify`,
      { data: {} }
    );
    expect(res.status()).toBe(200);
    await ctx.close();

    // Poll for the notification.
    const admin = buildAdmin();
    let seen = false;
    for (let i = 0; i < 10; i++) {
      const { data } = await admin
        .from("notifications")
        .select("kind")
        .eq("user_id", applicantUserId!)
        .eq("kind", "lawyer.verified")
        .maybeSingle();
      if (data) {
        seen = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    expect(seen).toBe(true);
  });

  test("4. admin sees lead in /admin/leads and marks it called", async ({
    browser,
    baseURL
  }) => {
    const ctx = await contextForUser(browser, baseURL!, ADMIN_EMAIL);
    const page = await ctx.newPage();
    const list = await page.request.get("/api/admin/leads?status=new");
    expect(list.status()).toBe(200);
    const body = await list.json();
    const ids = (body.items ?? []).map((l: { id: string }) => l.id);
    expect(ids).toContain(leadId);

    const action = await page.request.post(`/api/admin/leads/${leadId}`, {
      data: { action: "mark_called" }
    });
    expect(action.status()).toBe(200);
    const after = await action.json();
    expect(after.status).toBe("called");
    await ctx.close();
  });

  test("5. admin sees pending UPI payment in /admin/payments", async ({
    browser,
    baseURL
  }) => {
    const ctx = await contextForUser(browser, baseURL!, ADMIN_EMAIL);
    const page = await ctx.newPage();
    const res = await page.request.get(
      "/api/admin/payments?status=pending_verification"
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    const ids = (body.items ?? []).map((p: { id: string }) => p.id);
    expect(ids).toContain(pendingPaymentId);
    await ctx.close();
  });

  test("6. admin verifies the UPI payment; user gets notified", async ({
    browser,
    baseURL
  }) => {
    const ctx = await contextForUser(browser, baseURL!, ADMIN_EMAIL);
    const page = await ctx.newPage();
    const res = await page.request.post(
      `/api/admin/payments/${pendingPaymentId}/verify`,
      { data: { action: "verify" } }
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("captured");
    await ctx.close();

    // Confirm the user got a notification.
    const admin = buildAdmin();
    let seen = false;
    for (let i = 0; i < 10; i++) {
      const { data } = await admin
        .from("notifications")
        .select("kind, title")
        .eq("user_id", payerUserId!)
        .order("created_at", { ascending: false })
        .limit(5);
      if (
        (data ?? []).some((r) =>
          /payment verified/i.test(r.title)
        )
      ) {
        seen = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    expect(seen).toBe(true);
  });

  test("7. teardown — delete ephemeral users and payment leftover", async () => {
    const admin = buildAdmin();
    if (leadId) {
      await admin.from("consultation_leads").delete().eq("id", leadId);
    }
    await cleanupEphemeralUsers(admin);
  });
});
