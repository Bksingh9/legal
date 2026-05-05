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
app/                 Next.js App Router (landing + /api/waitlist)
components/landing/  Hero, tiers, compliance banner
components/ui/       Button, Input
components/          WaitlistForm (client)
lib/supabase/        Browser + server clients
lib/utils.ts         cn() class helper
supabase/migrations/ SQL migrations
SPEC.md              Product spec v1.0
```

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
