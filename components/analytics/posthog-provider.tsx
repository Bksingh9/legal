"use client";

import { useEffect } from "react";
import { initPostHog } from "@/lib/analytics/posthog";

// Hidden client component that fires PostHog init on first paint.
// Rendered from the root layout. No-ops without NEXT_PUBLIC_POSTHOG_KEY.
export function PostHogProvider() {
  useEffect(() => {
    initPostHog();
  }, []);
  return null;
}
