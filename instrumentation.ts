// Next.js instrumentation entry point — runs once on cold start.
// Loads Sentry for the matching runtime.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  } else if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Sentry helper for capturing request errors via the Next.js
// experimental request-error hook. Imported with a runtime check
// so the SDK upgrade path stays smooth.
import * as Sentry from "@sentry/nextjs";
export const onRequestError = Sentry.captureRequestError;
