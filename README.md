# LegalDesk AI

AI-powered legal help for India — triage, document automation, and lawyer
consultations. BCI Rule 36 compliant, DPDP Act 2023 aligned, India-resident data.

The full product spec lives in [`SPEC.md`](./SPEC.md). This README covers the
Week 1–6 build: landing + waitlist (W1–2), Tier 1 AI triage (W3–4), and Tier 2
document automation with Razorpay (W5–6).

## Stack
- Next.js 14 App Router + TypeScript + Tailwind
- Supabase (Postgres + Auth + Storage + RLS) on `ap-south-1`
- Anthropic Claude API (Sonnet 4.6 default, Haiku 4.5 for cheap classification)
- Razorpay + Stripe (NRI), Exotel + 100ms, AiSensy/Gupshup, Resend, PostHog, Sentry
- Vercel + GitHub + Cloudflare

## Local development

```bash
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY (other keys can be left blank for Week 1–2).
npm install
npm run dev
```

All routes degrade gracefully when their dependencies are missing:

- `/api/waitlist` accepts the signup but does not persist when Supabase is unset.
- `/api/triage/classify` and `/api/triage/prep` use deterministic mocks when
  `ANTHROPIC_API_KEY` is unset, so the entire `/triage` UI works on a fresh
  checkout without spending any tokens.
- `/api/triage/transcribe` returns a stub transcript when `SARVAM_API_KEY`
  is unset.
- `/api/payments/order` calls a deterministic Razorpay mock that returns
  `order_mock_<hex>` ids when `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` are
  unset; the webhook handler accepts the literal `mock` signature so the
  finalize path can be walked end-to-end without keys.
- `/api/payments/webhook` continues to function without `RESEND_API_KEY` or
  `AISENSY_API_KEY`; both senders fall back to console-only logs.

## Database
Migrations live in `supabase/migrations/` and are applied in numbered order.

- `0001_initial_schema.sql` — spec §5 tables (users, lawyers, queries,
  documents, consultations, payments, subscriptions, wallet, audit_log,
  waitlist) with RLS.
- `0002_triage_extensions.sql` — extends `queries` with language, confidence,
  transcript_url, summary, status enum, updated_at; creates the `case-prep`
  and `triage-audio` Storage buckets with owner-only read RLS keyed off
  the leading `{user_id}/` folder in the object path.
- `0003_documents_payments.sql` — extends `documents` for the SKU model
  (sku, price_paise, output_docx_url, addon_lawyer_review, language,
  payment_id, updated_at) and `payments` for Razorpay (razorpay_order_id,
  currency, captured_at) with a unique partial index for webhook
  deduplication; adds the `lawyer_reviews` queue table with owner +
  assigned-lawyer RLS; creates the private `documents` Storage bucket.

Apply via the Supabase CLI:

```bash
supabase db push
```

All tables have RLS enabled. Service-role inserts (e.g. `/api/waitlist`,
`/api/triage/*`) bypass RLS by design.

## Project layout

```
app/                 Next.js App Router
  api/health/        Liveness + dep-config probe
  api/waitlist/      Waitlist intake (zod-validated)
  api/triage/        classify, prep, transcribe
  api/documents/     [sku]/preview (validate + render), POST /create-draft
  api/payments/      order, webhook (signature-verified)
  auth/login/        Magic-link request form
  auth/callback/     Supabase code-for-session exchange
  triage/            Email-gated triage chat
  documents/         Index + per-SKU guided form / preview / checkout
  privacy/, terms/
  opengraph-image/, robots.ts, sitemap.ts
components/landing/  Hero, tiers, compliance banner
components/triage/   TriageChat, VoiceRecorder, Disclaimer
components/documents/ DocumentForm, DocumentPreview, CheckoutButton
components/auth/     LoginForm
components/ui/       Button, Input
lib/anthropic/       Client (real + deterministic mock), prompts, types
lib/triage/          Service-role helpers for the queries table
lib/skus/            SKU registry + zod input schemas (5 launch SKUs)
lib/templates/       Deterministic structured-doc renderers per SKU
lib/forms/           FormSpec definitions consumed by DocumentForm
lib/pdf/             @react-pdf/renderer renderers (Case Prep + generic)
lib/docx/            docx package renderer (DocumentRender -> .docx)
lib/razorpay/        Orders API + signature verification (HMAC-SHA256)
lib/payments/        Idempotent payment row helpers
lib/documents/       Document row CRUD
lib/lawyer-reviews/  Queue insert for the +Rs 499 add-on
lib/users/           Service-role read of email/phone/name for delivery
lib/notify/          Resend (email) + AiSensy (WhatsApp) senders
lib/storage/         Storage bucket helpers (case-prep, documents)
lib/supabase/        Browser + server clients
supabase/migrations/ SQL migrations (0001-0003)
.github/workflows/   CI (typecheck + lint + build)
SPEC.md              Product spec v1.0
```

## Production deploy runbook

These steps need credentials only you can create. Once done, share the keys
(via your secrets manager) and we wire them into Vercel + `.env.local`.

### 1. Supabase (data + auth, ap-south-1)
1. Create a project at <https://supabase.com> — region **South Asia (Mumbai)**.
2. Project Settings → API: copy the **Project URL**, **anon public key**, and **service_role key**.
3. SQL Editor → paste `supabase/migrations/0001_initial_schema.sql` → Run.
4. Auth → Providers: enable **Email (magic link)** and **Phone (MSG91/Twilio)**.

### 2. Anthropic
1. Create a workspace at <https://console.anthropic.com>.
2. API Keys → create a key scoped to this project. Save as `ANTHROPIC_API_KEY`.
3. Defaults: `ANTHROPIC_TRIAGE_MODEL=claude-sonnet-4-6` and
   `ANTHROPIC_CLASSIFY_MODEL=claude-haiku-4-5-20251001`. Override only if you
   know what you're doing.

### 2a. Sarvam.ai (optional, Indic STT)
1. Get a key at <https://www.sarvam.ai/>.
2. Save as `SARVAM_API_KEY`. Without it, `/api/triage/transcribe` returns a
   stub transcript so the UI still works during development.

### 2b. Razorpay (W5+ payments)
1. Create an account at <https://dashboard.razorpay.com/>.
2. Settings -> API Keys -> Generate. Save `RAZORPAY_KEY_ID` and
   `RAZORPAY_KEY_SECRET`.
3. Settings -> Webhooks -> Add. URL: `https://legaldesk.ai/api/payments/webhook`.
   Events: `payment.captured`. Generate a secret and save as
   `RAZORPAY_WEBHOOK_SECRET`.
4. Razorpay Route is needed for lawyer payouts in W7-8 — defer until
   lawyer onboarding lands.

### 2c. Resend (W5+ email delivery)
1. Create an account at <https://resend.com/>.
2. Add and verify the sending domain (e.g. legaldesk.ai). Set
   `RESEND_FROM` to the verified `From` address.
3. Save the API key as `RESEND_API_KEY`. Without it, the post-payment
   email send is logged to the server console only.

### 2d. AiSensy (W5+ WhatsApp delivery)
1. Create an account at <https://www.aisensy.com/>.
2. Get the API key from Settings and save as `AISENSY_API_KEY`.
3. Create a `document_delivery` template with one media slot and
   `{{user_name}}` + `{{sku}}` parameters.

### 3. Vercel (hosting)
1. Import the GitHub repo `Bksingh9/legal` at <https://vercel.com/new>.
2. Framework preset: **Next.js**. Root directory: repo root.
3. Environment Variables: paste everything from `.env.example` you have keys for.
   At minimum for v0 deploy: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`.
4. Deploy. The branch `claude/legaldesk-ai-spec-StZVL` will get a preview URL;
   merge to `main` to publish to production.

### 4. Domain (Cloudflare)
1. Add `legaldesk.ai` to Cloudflare. Update registrar nameservers.
2. In Vercel → Project → Domains: add `legaldesk.ai` and `www.legaldesk.ai`.
3. Cloudflare DNS: add the records Vercel asks for. Set proxy mode to **DNS only** (grey cloud) for the apex during issuance, then enable orange cloud + WAF.
4. Set `NEXT_PUBLIC_SITE_URL=https://legaldesk.ai` in Vercel env vars.

### Smoke test after deploy
```bash
# Liveness + dep-config
curl https://legaldesk.ai/api/health
# Waitlist
curl -X POST https://legaldesk.ai/api/waitlist \
  -H 'content-type: application/json' \
  -d '{"email":"founder@example.com"}'
# Triage classify (anonymous; mock when keys absent, real Haiku otherwise)
curl -X POST https://legaldesk.ai/api/triage/classify \
  -H 'content-type: application/json' \
  -d '{"raw_text":"My landlord has not returned my deposit."}'
# Triage prep (returns structured Case Prep + signed PDF URL when authed)
curl -X POST https://legaldesk.ai/api/triage/prep \
  -H 'content-type: application/json' \
  -d '{"raw_text":"My landlord has not returned my deposit.","classification":"property","language":"en"}'
# Document preview (validates against the SKU's zod schema)
curl -X POST https://legaldesk.ai/api/documents/legal-notice/preview \
  -H 'content-type: application/json' \
  -d '{"language":"en","sender":{"name":"X","address":"..."},"recipient":{"name":"Y","address":"..."},"cause":{"date_of_event":"2025-12-01","place":"Mumbai","description":"..."},"demand":{"summary":"refund","deadline_days":15}}'
```

## CI

`.github/workflows/ci.yml` runs typecheck, lint, and build on every push to
`main` and every PR. Vercel runs the same build per push automatically.

## Compliance reminders
- No public lawyer profiles, names, photos, or testimonials anywhere.
- Every AI-generated legal output ships with the BCI disclaimer.
- Consultation calls are recorded only after both-party consent.
- All PII stays in `ap-south-1`. Honour DPDP deletion requests.

## Roadmap (next 90 days, immutable)
- W1–2 scaffold + landing + waitlist  — done
- W3–4 Tier 1 AI triage — done (mock-tested, awaiting real Anthropic + Supabase keys)
- W5–6 Tier 2 document automation + Razorpay  ← you are here
- W7–8 lawyer onboarding + KYC
- W9–10 Tier 3 consultation flow (Exotel + 100ms)
- W11–12 subscriptions + referral + 50 SEO articles + bug bash
