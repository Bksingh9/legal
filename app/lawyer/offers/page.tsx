import { redirect } from "next/navigation";
import { LawyerOffersList } from "@/components/lawyer/offers-list";
import { DashboardShell } from "@/components/landing/dashboard-shell";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Pending offers — LegalDesk AI" };
export const dynamic = "force-dynamic";

const tabs = [
  { href: "/lawyer", label: "Application" },
  { href: "/lawyer/offers", label: "Pending offers" }
];

export default async function LawyerOffersPage() {
  const supa = getSupabaseServerClient();
  if (supa) {
    const {
      data: { user }
    } = await supa.auth.getUser();
    if (!user) redirect("/auth/login?next=/lawyer/offers");
  }

  return (
    <DashboardShell
      eyebrow="Lawyer dashboard"
      title="Pending offers"
      description="First-come, first-served. Sibling offers expire automatically once you accept."
      tabs={tabs}
      activeHref="/lawyer/offers"
      maxWidth="lg"
    >
      <LawyerOffersList />
    </DashboardShell>
  );
}
