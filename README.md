# LegalDesk AI

AI-powered legal help for India — triage, document automation, and lawyer
consultations. BCI Rule 36 compliant, DPDP Act 2023 aligned, India-resident data.

The full product spec lives in [`SPEC.md`](./SPEC.md). This README covers the
Week 1–2 scaffold (landing + waitlist).

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

The waitlist API gracefully no-ops persistence when Supabase env vars are
missing, so the landing page works on a fresh checkout.

## Database
The initial schema (spec §5) lives at
`supabase/migrations/0001_initial_schema.sql`. Apply it via the Supabase CLI:

```bash
supabase db push
```

All tables have RLS enabled. Service-role inserts (e.g. `/api/waitlist`) bypass
RLS by design.

## Project layout

```
app/                 Next.js App Router
  api/health/        Liveness + dep-config probe
  api/waitlist/      Waitlist intake (zod-validated)
  privacy/           Privacy policy (DPDP)
  terms/             Terms of service (BCI-aligned)
  opengraph-image/   Generated OG card
  robots.ts          robots.txt
  sitemap.ts         sitemap.xml
components/landing/  Hero, tiers, compliance banner
components/ui/       Button, Input
components/          WaitlistForm (client)
lib/supabase/        Browser + server clients
lib/utils.ts         cn() class helper
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
curl https://legaldesk.ai/api/health           # 200 with deps map
curl -X POST https://legaldesk.ai/api/waitlist \
  -H 'content-type: application/json' \
  -d '{"email":"founder@example.com"}'          # 200 ok:true persisted:true
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
- W1–2 scaffold + landing + waitlist  ← you are here
- W3–4 Tier 1 AI triage
- W5–6 Tier 2 document automation + Razorpay
- W7–8 lawyer onboarding + KYC
- W9–10 Tier 3 consultation flow (Exotel + 100ms)
- W11–12 subscriptions + referral + 50 SEO articles + bug bash
