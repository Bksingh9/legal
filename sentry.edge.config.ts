// Edge-runtime Sentry init. No-op when SENTRY_DSN is unset.
// Used by edge routes (e.g. middleware, the OG image generator).

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.VERCEL_ENV ?? "development"
  });
}
