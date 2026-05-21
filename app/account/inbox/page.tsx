import { redirect } from "next/navigation";
import { Inbox } from "@/components/notifications/inbox";
import { PushRegister } from "@/components/notifications/push-register";
import { DashboardShell } from "@/components/landing/dashboard-shell";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Inbox — LegalDesk AI" };
export const dynamic = "force-dynamic";

const tabs = [
  { href: "/account", label: "Your data" },
  { href: "/account/inbox", label: "Inbox" },
  { href: "/referrals", label: "Referrals" }
];

export default async function InboxPage() {
  const supa = getSupabaseServerClient();
  if (supa) {
    const {
      data: { user }
    } = await supa.auth.getUser();
    if (!user) redirect("/auth/login?next=/account/inbox");
  }

  return (
    <DashboardShell
      eyebrow="Your inbox"
      title="Notifications"
      description="Every offer, schedule update, and consultation event lands here."
      tabs={tabs}
      activeHref="/account/inbox"
      maxWidth="md"
    >
      <Inbox />

      <div className="rounded-2xl border border-ink-100 bg-ink-50/60 p-5">
        <p className="text-sm font-medium text-ink-900">Off-app pings</p>
        <p className="mt-1 text-xs text-ink-700">
          Get notified even when this tab is closed. Browser-native, no third-party push service.
        </p>
        <div className="mt-3">
          <PushRegister />
        </div>
      </div>
    </DashboardShell>
  );
}
