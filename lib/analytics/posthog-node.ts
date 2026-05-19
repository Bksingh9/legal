import { PostHog } from "posthog-node";

// Server-side PostHog. No-op when NEXT_PUBLIC_POSTHOG_KEY is unset
// (we reuse the public key — PostHog scopes events by project, not
// by key role).

let client: PostHog | null = null;

function getClient(): PostHog | null {
  if (client) return client;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  client = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com",
    flushAt: 1,
    flushInterval: 0
  });
  return client;
}

export async function trackServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
): Promise<void> {
  const c = getClient();
  if (!c) return;
  c.capture({ distinctId, event, properties });
  // Vercel functions are short-lived; flush before returning so events
  // don't get dropped.
  await c.flush();
}
