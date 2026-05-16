import { redirect } from "next/navigation";
import { Inbox } from "@/components/notifications/inbox";
import { PushRegister } from "@/components/notifications/push-register";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Inbox — LegalDesk AI" };
export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const supa = getSupabaseServerClient();
  if (supa) {
    const {
      data: { user }
    } = await supa.auth.getUser();
    if (!user) redirect("/auth/login?next=/account/inbox");
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12">
      <header>
        <p className="text-xs uppercase tracking-wide text-neutral-500">Your inbox</p>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Every offer, schedule update, and consultation event lands here.
        </p>
      </header>

      <section>
        <Inbox />
      </section>

      <section className="rounded-md border border-ink-100 p-4">
        <p className="text-sm font-medium">Off-app pings</p>
        <p className="mt-1 text-xs text-neutral-600">
          Get notified even when this tab is closed. Browser-native, no
          third-party push service.
        </p>
        <div className="mt-3">
          <PushRegister />
        </div>
      </section>
    </main>
  );
}
