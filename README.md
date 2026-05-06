# LegalDesk AI

AI-powered legal help for India — triage, document automation, and lawyer
consultations. BCI Rule 36 compliant, DPDP Act 2023 aligned, India-resident data.

The full product spec lives in [`SPEC.md`](./SPEC.md). This README covers the
Week 1–4 build: landing + waitlist (W1–2) and the Tier 1 AI triage flow (W3–4).

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

## Database
Migrations live in `supabase/migrations/` and are applied in numbered order.

- `0001_initial_schema.sql` — spec §5 tables (users, lawyers, queries,
  documents, consultations, payments, subscriptions, wallet, audit_log,
  waitlist) with RLS.
- `0002_triage_extensions.sql` — extends `queries` with language, confidence,
  transcript_url, summary, status enum, updated_at; creates the `case-prep`
  and `triage-audio` Storage buckets with owner-only read RLS keyed off
  the leading `{user_id}/` folder in the object path.

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
  api/triage/
    classify/        Haiku classifier
    prep/            Sonnet Case Prep + PDF + Storage upload
    transcribe/      Indic STT (Sarvam) with mock fallback
  auth/login/        Magic-link request form
  auth/callback/     Supabase code-for-session exchange
  triage/            Email-gated triage chat
  privacy/, terms/
  opengraph-image/, robots.ts, sitemap.ts
components/landing/  Hero, tiers, compliance banner
components/triage/   TriageChat, VoiceRecorder, Disclaimer
components/auth/     LoginForm
components/ui/       Button, Input
lib/anthropic/       Client (real + deterministic mock), prompts, types
lib/triage/          Service-role helpers for the queries table
lib/pdf/             @react-pdf/renderer Case Prep template
lib/storage/         Storage bucket helpers (case-prep)
lib/supabase/        Browser + server clients
supabase/migrations/ SQL migrations
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
- W3–4 Tier 1 AI triage  ← you are here (mock-tested, awaiting real Anthropic + Supabase keys)
- W5–6 Tier 2 document automation + Razorpay
- W7–8 lawyer onboarding + KYC
- W9–10 Tier 3 consultation flow (Exotel + 100ms)
- W11–12 subscriptions + referral + 50 SEO articles + bug bash
