import webpush from "web-push";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

let vapidConfigured = false;
function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export interface PushArgs {
  userId: string;
  title: string;
  body?: string;
  link?: string;
}

// Best-effort fanout to every active push_subscription for the user.
// Failures (expired endpoints, browser-side errors) are caught and the
// expired subscription is removed so subsequent calls stop trying.
export async function sendWebPush(args: PushArgs): Promise<number> {
  if (!ensureVapid()) return 0;
  const supa = getSupabaseServiceClient();
  if (!supa) return 0;

  const { data: subs, error } = await supa
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", args.userId);
  if (error || !subs || subs.length === 0) return 0;

  const payload = JSON.stringify({
    title: args.title,
    body: args.body ?? "",
    link: args.link ?? "/"
  });

  let delivered = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth }
          },
          payload
        );
        delivered++;
      } catch (err: unknown) {
        const status =
          err && typeof err === "object" && "statusCode" in err
            ? (err as { statusCode: number }).statusCode
            : 0;
        if (status === 404 || status === 410) {
          await supa.from("push_subscriptions").delete().eq("id", s.id);
        } else {
          console.warn("[web-push] send failed", status, (err as Error)?.message);
        }
      }
    })
  );
  return delivered;
}
