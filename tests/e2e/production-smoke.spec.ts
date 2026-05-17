import { test, expect, type Page, type APIResponse } from "@playwright/test";

// Production smoke — runs against the live deploy.
//
// What it asserts:
//   1. Every public page returns 200 and contains the page-defining element.
//   2. Tier-0 contract: landing CTAs go to /triage and /documents (no waitlist).
//   3. BCI Rule 36 disclaimer renders on the landing.
//   4. Auth-gated routes redirect to /auth/login?next=<path>.
//   5. /api/health is healthy and reports the LLM routing as `local`.
//   6. /api/waitlist persists a tagged signup.
//   7. robots.txt + sitemap.xml are wired to the production host.
//   8. opengraph-image returns an image.
//
// What it does NOT assert (out of scope for safe-against-prod smoke):
//   - The magic-link login flow (would mint real auth.users rows).
//   - Razorpay checkout (would touch the demo payment infra).

const PUBLIC_PAGES = [
  { path: "/", titleFragment: "LegalDesk", h1: /AI-powered legal help for India/i },
  { path: "/triage", titleFragment: "AI triage", h1: /Tell us what happened/i },
  { path: "/documents/legal-notice", titleFragment: "LegalDesk", h1: /Legal notice/i },
  { path: "/pricing", titleFragment: "Pricing", h1: /Pay per document|Plus|Pricing/i },
  { path: "/blog", titleFragment: "LegalDesk", h1: /Indian legal explainers|Blog/i },
  { path: "/for-lawyers", titleFragment: "advocates", h1: /matched with paying clients/i },
  { path: "/privacy", titleFragment: "Privacy Policy", h1: /Privacy Policy/i },
  { path: "/terms", titleFragment: "Terms of Service", h1: /Terms of Service/i }
];

const AUTH_GATED_PATHS = [
  "/consult",
  "/lawyer",
  "/account",
  "/referrals"
];

async function getStatusFollowingRedirects(
  page: Page,
  path: string
): Promise<{ status: number; finalUrl: string; locationChain: string[] }> {
  const locations: string[] = [];
  const response = await page.request.get(path, {
    maxRedirects: 0,
    failOnStatusCode: false
  });
  if (response.status() >= 300 && response.status() < 400) {
    locations.push(response.headers()["location"] ?? "");
  }
  return {
    status: response.status(),
    finalUrl: response.url(),
    locationChain: locations
  };
}

test.describe("public pages", () => {
  for (const p of PUBLIC_PAGES) {
    test(`GET ${p.path} renders`, async ({ page }) => {
      const resp = await page.goto(p.path);
      expect(resp?.status(), `status for ${p.path}`).toBeLessThan(400);
      await expect(page).toHaveTitle(new RegExp(p.titleFragment, "i"));
      await expect(page.locator("h1").first()).toContainText(p.h1);
    });
  }

  test("landing CTAs link to the live product surfaces (not waitlist)", async ({ page }) => {
    await page.goto("/");
    const talkCta = page.getByRole("link", { name: /Talk to a lawyer/i }).first();
    const triageCta = page.getByRole("link", { name: /Free AI triage/i });
    const docsCta = page.getByRole("link", { name: /Browse documents/i });
    await expect(talkCta).toBeVisible();
    await expect(triageCta).toBeVisible();
    await expect(docsCta).toBeVisible();
    await expect(talkCta).toHaveAttribute("href", "/talk-to-lawyer");
    await expect(triageCta).toHaveAttribute("href", "/triage");
    await expect(docsCta).toHaveAttribute("href", "/documents");

    // The old waitlist copy must not surface anywhere on the landing.
    await expect(page.getByText(/Join the waitlist/i)).toHaveCount(0);
    await expect(page.getByText(/we'?ll email you when LegalDesk goes live/i)).toHaveCount(0);
  });

  test("compliance disclaimer visible on landing", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/BCI Rule 36/i).first()).toBeVisible();
    await expect(page.getByText(/DPDP Act 2023/i).first()).toBeVisible();
    await expect(page.getByText(/Not legal advice|not.*legal.*advice/i).first()).toBeVisible();
  });
});

test.describe("auth-gated routes redirect cleanly", () => {
  for (const path of AUTH_GATED_PATHS) {
    test(`GET ${path} -> /auth/login?next=${path}`, async ({ page }) => {
      const { status, locationChain } = await getStatusFollowingRedirects(page, path);
      expect([302, 307, 308]).toContain(status);
      const location = locationChain[0] ?? "";
      expect(location).toMatch(/\/auth\/login/);
      expect(decodeURIComponent(location)).toContain(`next=${path}`);
    });
  }

  test("/auth/login renders an email form", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.locator("input[type=email]").first()).toBeVisible();
    await expect(page.getByRole("button").first()).toBeVisible();
  });
});

test.describe("APIs", () => {
  test("/api/health is healthy with supabase wired and local LLM routing", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.service).toBe("legaldesk-ai");
    expect(body.deps.supabase).toBe(true);
    expect(body.llm_routing["triage.classify"]).toBe("local");
    expect(body.llm_routing["triage.prep"]).toBe("local");
    expect(body.llm_routing["consult.summarize"]).toBe("local");
    expect(body.llm_routing["blog.generate"]).toBe("local");
  });

  test("/api/waitlist persists a tagged signup", async ({ request }) => {
    const email = `qa-smoke+${Date.now()}@legaldesk-test.ai`;
    const res = await request.post("/api/waitlist", {
      data: { email, source: "production-smoke" }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.persisted).toBe(true);
  });

  test("/api/waitlist rejects invalid input with 400", async ({ request }) => {
    const res = await request.post("/api/waitlist", {
      data: { email: "not-an-email" }
    });
    expect(res.status()).toBe(400);
  });

  test("/api/triage/classify is public (no auth required)", async ({ request }) => {
    const res = await request.post("/api/triage/classify", {
      data: { raw_text: "My landlord refused to refund my deposit of Rs 50000." }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.classification).toBe("string");
    expect(body.persisted).toBe(false);
  });

  test("/api/triage/transcribe still 501s when STT is unconfigured", async ({ request }) => {
    const res = await request.post("/api/triage/transcribe", {
      multipart: {
        audio: { name: "x.webm", mimeType: "audio/webm", buffer: Buffer.from("0") }
      }
    });
    expect([400, 413, 501]).toContain(res.status());
  });

  test("/api/documents/legal-notice/download issues a real PDF without auth", async ({
    request
  }) => {
    const res = await request.post(
      "/api/documents/legal-notice/download?format=pdf",
      {
        data: {
          sender: { name: "QA Anon", address: "1 Test Lane, Mumbai 400001" },
          recipient: { name: "Acme LLP", address: "2 Test Road, Mumbai 400002" },
          cause: {
            date_of_event: "2026-04-01",
            place: "Mumbai",
            description:
              "Failure to refund deposit of Rs 50000 paid at start of tenancy."
          },
          demand: {
            summary: "Refund the deposit in full.",
            deadline_days: 15
          }
        }
      }
    );
    expect(res.status()).toBe(200);
    const bytes = await res.body();
    expect(bytes.slice(0, 4).toString("utf8")).toBe("%PDF");
  });
});

test.describe("SEO + robots + OG", () => {
  test("robots.txt allows crawlers, points at sitemap on the same host", async ({
    request,
    baseURL
  }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body.toLowerCase()).toContain("user-agent:");
    expect(body).toContain("Sitemap:");
    expect(body).toContain(baseURL ?? "legaldesk-ai");
  });

  test("sitemap.xml lists the canonical pages", async ({ request, baseURL }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("<urlset");
    expect(body).toContain(`${baseURL}/`);
    expect(body).toContain(`${baseURL}/privacy`);
    expect(body).toContain(`${baseURL}/terms`);
  });

  test("OG image renders as PNG", async ({ request }) => {
    const res: APIResponse = await request.get("/opengraph-image");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
    const buf = await res.body();
    expect(buf.byteLength).toBeGreaterThan(1000);
  });
});

test.describe("tiers section + landing content", () => {
  test("renders all 4 tier cards with prices", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Tier 1 — AI Triage/i)).toBeVisible();
    await expect(page.getByText(/Tier 2 — Document Automation/i)).toBeVisible();
    await expect(page.getByText(/Tier 3 — Talk to a Lawyer/i)).toBeVisible();
    await expect(page.getByText(/LegalDesk Plus/i)).toBeVisible();
    // Spot-check pricing literals from spec §3.
    await expect(page.getByText(/Legal notice — ₹499/i)).toBeVisible();
    await expect(page.getByText(/Rent agreement \(11-month\) — ₹399/i)).toBeVisible();
    await expect(page.getByText(/₹999 \/ year/i)).toBeVisible();
  });
});

test.describe("magic-link send (no inbox check)", () => {
  test("submitting a real email on /auth/login reaches a terminal state", async ({
    page
  }) => {
    // Supabase free tier rate-limits OTP emails to 3/hour. Either the
    // success state appears or a rate-limit message — both prove the
    // form is wired to Supabase Auth correctly. We accept either.
    const email = `qa-magiclink+${Date.now()}@legaldesk-test.ai`;
    await page.goto("/auth/login?next=/triage");
    await page.locator("input[type=email]").fill(email);
    await page.getByRole("button", { name: /Send sign-in link/i }).click();
    await expect(
      page
        .getByText(/Check your email|email rate limit|too many requests|please wait/i)
        .first()
    ).toBeVisible({ timeout: 20_000 });
  });
});
