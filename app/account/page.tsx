import { redirect } from "next/navigation";
import { DpdpControls } from "@/components/account/dpdp-controls";
import { PasswordCard } from "@/components/auth/password-card";
import { DashboardShell } from "@/components/landing/dashboard-shell";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Your data — LegalDesk AI" };
export const dynamic = "force-dynamic";

const tabs = [
  { href: "/account", label: "Your data" },
  { href: "/account/inbox", label: "Inbox" },
  { href: "/referrals", label: "Referrals" }
];

export default async function AccountPage() {
  const supa = getSupabaseServerClient();
  const mockMode = !supa;
  if (supa) {
    const {
      data: { user }
    } = await supa.auth.getUser();
    if (!user) redirect("/auth/login?next=/account");
  }

  return (
    <DashboardShell
      eyebrow="Your data"
      title="Access, correction, erasure"
      description="DPDP Act 2023 rights. Export, correct, or erase your data at any time. We log every action against the audit trail."
      tabs={tabs}
      activeHref="/account"
      maxWidth="md"
    >
      {mockMode ? (
        <div className="rounded-xl border border-accent-200 bg-accent-50 p-3 text-xs text-ink-900">
          Running in mock mode. Actions return stub responses without a configured Supabase project.
        </div>
      ) : null}

      <DpdpControls />
      <PasswordCard />
    </DashboardShell>
  );
}
