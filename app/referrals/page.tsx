import { redirect } from "next/navigation";
import { ReferralCard } from "@/components/referrals/code-card";
import { DashboardShell } from "@/components/landing/dashboard-shell";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Referrals — LegalDesk AI" };
export const dynamic = "force-dynamic";

const tabs = [
  { href: "/account", label: "Your data" },
  { href: "/account/inbox", label: "Inbox" },
  { href: "/referrals", label: "Referrals" }
];

export default async function ReferralsPage() {
  const supa = getSupabaseServerClient();
  if (supa) {
    const {
      data: { user }
    } = await supa.auth.getUser();
    if (!user) redirect("/auth/login?next=/referrals");
  }

  return (
    <DashboardShell
      eyebrow="Refer friends"
      title="Earn wallet credit for every friend."
      description="Share your code. We credit your wallet on signup and again when they complete their first paid transaction. No cap."
      tabs={tabs}
      activeHref="/referrals"
      maxWidth="md"
    >
      <ReferralCard />
    </DashboardShell>
  );
}
