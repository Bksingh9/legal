// Client-side Sentry init. No-op when NEXT_PUBLIC_SENTRY_DSN is unset.
// Tier-0 keeps working without a Sentry account; opt in by setting
// the DSN on Vercel + redeploying.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    environment:
      process.env.NEXT_PUBLIC_SITE_URL?.includes("vercel.app") ||
      process.env.NEXT_PUBLIC_SITE_URL?.includes("legaldesk.ai")
        ? "production"
        : "development",
    // PII protection: scrub any DPDP-sensitive headers before send.
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers["cookie"];
        delete event.request.headers["authorization"];
        delete event.request.headers["x-rate-limit-bypass"];
      }
      return event;
    }
  });
}
