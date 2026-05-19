"use client";

import posthog from "posthog-js";

// Browser-side PostHog. No-ops when NEXT_PUBLIC_POSTHOG_KEY is unset
// so the Tier-0 contract holds — analytics is purely opt-in via the
// env var on Vercel.

let initialised = false;

export function initPostHog(): void {
  if (initialised) return;
  if (typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";
  posthog.init(key, {
    api_host: host,
    capture_pageview: true,
    person_profiles: "identified_only",
    persistence: "localStorage+cookie",
    autocapture: false,
    disable_session_recording: true
  });
  initialised = true;
}

export function trackEvent(
  event: string,
  properties?: Record<string, unknown>
): void {
  if (!initialised) return;
  posthog.capture(event, properties);
}

export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  if (!initialised) return;
  posthog.identify(userId, traits);
}

export function resetIdentity(): void {
  if (!initialised) return;
  posthog.reset();
}
