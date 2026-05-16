import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { sendWebPush } from "@/lib/notify/web-push";

export type NotificationKind =
  | "welcome"
  | "offer.new"
  | "consultation.scheduled"
  | "consultation.starting"
  | "consultation.finished"
  | "lawyer.application.new"
  | "lawyer.verified"
  | "lawyer.suspended";

export interface NotifyArgs {
  userId: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  link?: string;
}

// Inserts a notification row (durable inbox) and best-effort triggers
// Web Push fanout. Both steps are no-ops if Supabase is not wired; the
// returned row id can be used by callers to test the path.
export async function notifyUser(args: NotifyArgs): Promise<string | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;

  const { data, error } = await supa
    .from("notifications")
    .insert({
      user_id: args.userId,
      kind: args.kind,
      title: args.title,
      body: args.body ?? null,
      link: args.link ?? null
    })
    .select("id")
    .single();

  if (error) {
    console.error("[notify/inbox] insert failed", error);
    return null;
  }

  // Fire-and-forget Web Push. Errors are logged inside sendWebPush.
  void sendWebPush({
    userId: args.userId,
    title: args.title,
    body: args.body,
    link: args.link
  });

  return data?.id ?? null;
}

// Bulk notify — used when a single event fans out to many recipients
// (e.g. a new lawyer application notifying every admin).
export async function notifyMany(
  recipients: string[],
  shared: Omit<NotifyArgs, "userId">
): Promise<number> {
  if (recipients.length === 0) return 0;
  const supa = getSupabaseServiceClient();
  if (!supa) return 0;

  const rows = recipients.map((userId) => ({
    user_id: userId,
    kind: shared.kind,
    title: shared.title,
    body: shared.body ?? null,
    link: shared.link ?? null
  }));

  const { error } = await supa.from("notifications").insert(rows);
  if (error) {
    console.error("[notify/inbox] bulk insert failed", error);
    return 0;
  }

  await Promise.all(
    recipients.map((userId) =>
      sendWebPush({
        userId,
        title: shared.title,
        body: shared.body,
        link: shared.link
      })
    )
  );
  return recipients.length;
}

export async function getAdminUserIds(): Promise<string[]> {
  const supa = getSupabaseServiceClient();
  if (!supa) return [];
  const { data, error } = await supa
    .from("users")
    .select("id")
    .eq("role", "admin");
  if (error) {
    console.error("[notify/inbox] admin lookup failed", error);
    return [];
  }
  return (data ?? []).map((r) => r.id);
}
