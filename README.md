# LegalDesk AI

AI-powered legal help for India — triage, document automation, and lawyer
consultations. BCI Rule 36 compliant, DPDP Act 2023 aligned, India-resident data.

The full product spec lives in [`SPEC.md`](./SPEC.md). This README covers the
full Week 1–12 build:

- W1–2: landing + waitlist
- W3–4: Tier 1 AI triage with Hindi + voice + signed-PDF Case Prep
- W5–6: Tier 2 document automation (5 SKUs) + Razorpay one-time payments
- W7–8: lawyer onboarding + KYC + founder admin queue (BCI Rule 36 enforced)
- W9–10: Tier 3 consultations (match → offer → consent-gated start →
  transcript summary → 24h hold → Razorpay Route payout)
- W11–12: LegalDesk Plus annual subscription, referrals + wallet ledger,
  blog framework with Sonnet article generator, Playwright golden-path tests

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
- `0004_lawyer_extensions.sql` — extends `lawyers` with languages[],
  anon_slug (unique 12-hex internal id), route_account_id (Razorpay Route),
  digilocker_uri, and verified/suspended audit columns; backfills
  anon_slug on existing rows; adds GIN indexes on specializations and
  languages for the W9–10 match algorithm; adds `lawyer_applications`
  audit-trail table with applicant-read RLS.
- `0005_consultations.sql` — extends `consultations` for the full match →
  offer → start → finish → 24h-hold → release lifecycle (pack enum,
  recording-consent flags, payout fields, hms_room_id, exotel_call_sid);
  creates `consultation_offers` with `offer_status` enum and partial
  index on pending offers; promotes the wallet jsonb to a proper
  append-only `wallet_ledger` table; links `payments` back to
  consultations.
- `0006_subscriptions_referrals_blog.sql` — extends `subscriptions` for
  Razorpay Subscriptions (razorpay_subscription_id, razorpay_plan_id,
  paid_until, docs_used, consult_minutes_used); adds `referrals` (one
  row per user, 6-char Crockford code, signup/paid credits in paise) and
  `referral_claims` (idempotent ledger of who-was-referred-by-whom);
  adds `blog_posts` for founder-reviewed SEO articles with
  `blog_post_status` and a public-read RLS gate on `status='published'`.

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
  api/payouts/release   Cron-callable, X-Cron-Secret gated; sweeps
                        completed consults past 24h hold, issues
                        Razorpay Route transfers
  api/consultations/    book, [id]/consent, [id]/start, [id]/finish, [id]/dispute
  api/lawyer/        apply, me, offers, offers/[id]/{accept,decline}
  api/admin/lawyers/ Founder-only queue + verify/suspend actions
  api/subscriptions/ start (Razorpay Subscription), me (entitlements)
  api/referrals/     me (code + counters), apply (claim a code)
  api/wallet/balance Wallet balance in paise
  auth/login/        Magic-link request form
  auth/callback/     Supabase code-for-session exchange
  triage/            Email-gated triage chat
  documents/         Index + per-SKU guided form / preview / checkout
  consult/           Tier 3 booking form (pack / channel / spec / lang / state)
  lawyer/            Apply form + status dashboard (owner-only view)
  lawyer/offers/     Pending consult offers (accept / decline)
  admin/lawyers/     Founder-only verification queue UI
  pricing/           Tiers + Plus subscription start
  referrals/         Per-user code, share link, wallet balance
  blog/              SEO article index
  blog/[slug]/       Article page with Article + FAQPage JSON-LD
  privacy/, terms/
  opengraph-image/, robots.ts, sitemap.ts
components/landing/  Hero, tiers, compliance banner
components/triage/   TriageChat, VoiceRecorder, Disclaimer
components/documents/ DocumentForm, DocumentPreview, CheckoutButton
components/lawyer/   LawyerApplyForm
components/admin/    LawyerQueue (tabbed verification dashboard)
components/auth/     LoginForm
components/ui/       Button, Input
lib/llm/             Provider abstraction: types, router, six backends
                     (anthropic / openai / ollama / openrouter / sarvam / mock)
lib/anthropic/       Triage prompts + parsers (back-compat surface; uses lib/llm internally)
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
lib/lawyers/         Lawyer types/schemas, persistence, anon-card firewall
lib/admin/           requireAdmin role gate
lib/consult/         Packs, booking schema, payout split, persistence,
                     transcript summarization
lib/match/           Match algorithm (specialization × language × state, top 3)
lib/exotel/          Masked-number outbound dial client
lib/hms/             100ms room creation + auth-token signing
lib/subscriptions/   Plus persistence + entitlements helper
lib/referrals/       Code generator, claim ledger, wallet credit helpers
lib/blog/            Frontmatter loader + safe markdown renderer
content/blog/        Founder-reviewed SEO articles (markdown)
scripts/             generate-article.ts (Sonnet-driven content scaffolder)
tests/e2e/           Playwright golden-path specs
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

### 2. LLM provider (Anthropic is one of five)

The LLM layer is abstracted behind `lib/llm/router.ts`. Six backends ship:
`anthropic`, `openai`, `ollama`, `openrouter`, `sarvam`, `mock`. Four
workloads each pick a backend independently via env:

- `LLM_CLASSIFY` (Haiku-class — triage classification)
- `LLM_DRAFT` (Sonnet-class — Case Prep, document narrative fills)
- `LLM_SUMMARIZE` (Sonnet-class — consultation transcript summary)
- `LLM_BLOG` (Sonnet-class — SEO article generator)

Leave the four selectors blank and the router falls through the available
providers in order `anthropic → openai → openrouter → sarvam → ollama →
mock`, so `ANTHROPIC_API_KEY` alone is enough to light up the existing
deploy.

**Anthropic (default)**: console.anthropic.com → API Keys → create. Save
as `ANTHROPIC_API_KEY`. Defaults `ANTHROPIC_TRIAGE_MODEL=claude-sonnet-4-6`,
`ANTHROPIC_CLASSIFY_MODEL=claude-haiku-4-5-20251001`.

**OpenAI**: platform.openai.com → API keys → save as `OPENAI_API_KEY`.
For Azure India residency, additionally set `OPENAI_BASE_URL` to your
Azure deployment URL and set `OPENAI_DRAFT_MODEL` to the deployment name.

**Ollama (zero API spend, local)**:

```bash
brew install ollama
ollama serve &
ollama pull llama3.1:8b
export OLLAMA_BASE_URL=http://localhost:11434
export LLM_CLASSIFY=ollama LLM_DRAFT=ollama
```

`/triage` now runs entirely against your laptop GPU.

**OpenRouter (unified gateway)**: openrouter.ai → keys → save as
`OPENROUTER_API_KEY`. Set `OPENROUTER_DRAFT_MODEL` to any supported model id
(e.g. `mistralai/mistral-large-2411`, `meta-llama/llama-3.1-70b-instruct`).

**Sarvam (Indic-first)**: sarvam.ai → save as `SARVAM_API_KEY`. The same
key powers Indic STT in `/api/triage/transcribe`.

**Hybrid example** (cheap classify, quality draft):

```
LLM_CLASSIFY=ollama
LLM_DRAFT=anthropic
LLM_SUMMARIZE=openai
LLM_BLOG=openrouter
OPENROUTER_DRAFT_MODEL=anthropic/claude-sonnet-4.5
```

`/api/health` returns a `llm_routing` field showing which backend each
workload resolved to — quick check that your env config did what you
expected.

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

### 2e. Founder admin role (W7+ lawyer verification queue)
The `/admin/lawyers` queue and the `/api/admin/lawyers/*` routes are gated
on `users.role = 'admin'`. To grant yourself admin access:

1. Sign in once via `/auth/login` so a row exists in `auth.users`.
2. In the Supabase SQL editor:

```sql
update public.users set role = 'admin' where email = 'founder@legaldesk.ai';
```

3. Reload the app. `/admin/lawyers` will now load.

In a fresh local checkout (no `NEXT_PUBLIC_SUPABASE_URL`), the admin gate
falls open so the queue UI can be exercised without a real Supabase project.

### 2f. Razorpay Route (W7+ lawyer payouts)
No extra credentials beyond `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`. The
`/api/lawyer/apply` route attempts to create a Route linked account
(`POST /v2/accounts`) on each application; failures are non-blocking and
the admin can retry from the queue. Razorpay enables Route on production
keys after a separate KYC review on their side — request it before the
W9–10 lawyer-payout flow goes live.

### 2g. Exotel (W9+ masked-number calls)
1. Create an Exotel account at <https://exotel.com/>.
2. Subscribe to a virtual number (used as the masked CallerID).
3. Settings → API: copy the SID, API key and API token. Save as
   `EXOTEL_SID`, `EXOTEL_API_KEY`, `EXOTEL_API_TOKEN`. Save the
   virtual number as `EXOTEL_VIRTUAL_NUMBER` in E.164 format.
4. Without these, `/api/consultations/<id>/start` returns a deterministic
   mock `exotel_mock_<hex>` SID for the call channel.

### 2h. 100ms (W9+ video room)
1. Create an account at <https://www.100ms.live/>.
2. Apps → Add → Video Conferencing template. Copy the **Access Key**,
   **Secret**, and **Template ID**. Save as `HMS_ACCESS_KEY`,
   `HMS_SECRET`, `HMS_TEMPLATE_ID`.
3. Without these, `/api/consultations/<id>/start` returns a deterministic
   mock `room_mock_<hex>` plus an `auth_mock_…` token for the video channel.

### 2i. Cron secret (W9+ payout release)
Set `CRON_SECRET` to a long random string. The
`/api/payouts/release` route requires this in the `X-Cron-Secret`
header; without it the route returns 503. Vercel Cron, GitHub Actions,
or any external scheduler can hit the endpoint daily; pass
`?dry_run=1` to inspect what would be released without issuing
transfers.

### 2j. Plus plan id cache (W11+ subscriptions, optional)
After your first call to `/api/subscriptions/start` against real Razorpay
keys, copy the returned `plan_id` and set it as `RAZORPAY_PLUS_PLAN_ID`.
This skips the `POST /v1/plans` round-trip on subsequent subscription
creations.

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
# Lawyer apply (auth required in production; payload must include UPI VPA or bank+IFSC)
curl -X POST https://legaldesk.ai/api/lawyer/apply \
  -H 'content-type: application/json' \
  --cookie 'sb-access-token=...' \
  -d '{"bar_council_id":"D/1234/2018","state":"Maharashtra","years_exp":7,"specializations":["civil","property"],"languages":["en","hi","mr"],"payout":{"legal_business_name":"...","contact_name":"...","contact_email":"x@y.com","contact_phone":"+919999999999","upi_vpa":"x@upi"}}'
# Book a consult (Tier 3)
curl -X POST https://legaldesk.ai/api/consultations/book \
  -H 'content-type: application/json' \
  --cookie 'sb-access-token=...' \
  -d '{"pack":"p15","channel":"video","specialization":"property","language":"en","state":"Maharashtra"}'
# Cron sweep payouts (after 24h hold)
curl -X POST -H 'X-Cron-Secret: <CRON_SECRET>' https://legaldesk.ai/api/payouts/release
# Start a Plus subscription
curl -X POST --cookie 'sb-access-token=...' https://legaldesk.ai/api/subscriptions/start
# Read referral code + wallet
curl --cookie 'sb-access-token=...' https://legaldesk.ai/api/referrals/me
```

## E2E tests

Two golden-path Playwright specs live in `tests/e2e/`:

- `triage-to-document.spec.ts` — runs the triage → Case Prep flow and the
  legal-notice document form → preview flow.
- `health.spec.ts` — surface canary across every public route plus
  `/api/health`.

Run locally:

```bash
npm run build
npm run test:e2e:install   # one-time, downloads chromium
npm run test:e2e
```

Both specs run on every push to `main` and every PR via the existing
`.github/workflows/ci.yml` CI job.

## Blog generation

```bash
npx tsx scripts/generate-article.ts "how to file an RTI"
```

Drops a draft `.md` into `content/blog/` with `status: "draft"`. Founder
reviews and flips status to `"published"` before `/blog` surfaces it.
The generator never names a lawyer / judge / case (BCI Rule 36).

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
- W5–6 Tier 2 document automation + Razorpay — done
- W7–8 lawyer onboarding + KYC — done
- W9–10 Tier 3 consultation flow (Exotel + 100ms) — done
- W11–12 subscriptions + referral + blog framework + Playwright tests — done

The 90-day spec is fully scaffolded and mock-tested. Real keys turn each
surface from mock to production:

| Surface       | Required keys                                              |
| ------------- | ---------------------------------------------------------- |
| Triage        | `ANTHROPIC_API_KEY`, `SARVAM_API_KEY` (optional, Hindi STT)|
| Documents     | `RAZORPAY_*`, `RESEND_*`, `AISENSY_API_KEY`                |
| Lawyer onboarding | `RAZORPAY_*` (Route enabled)                           |
| Consultations | `EXOTEL_*`, `HMS_*`, `CRON_SECRET`                         |
| Plus          | `RAZORPAY_*` (Subscriptions enabled), `RAZORPAY_PLUS_PLAN_ID` cache |
| Referrals     | (no extra keys — works against Supabase only)              |
| Blog          | `ANTHROPIC_API_KEY` for the generator                      |
