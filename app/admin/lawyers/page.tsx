import { redirect } from "next/navigation";
import { LawyerQueue } from "@/components/admin/lawyer-queue";
import { DashboardShell } from "@/components/landing/dashboard-shell";
import { requireAdmin } from "@/lib/admin/role";

export const metadata = { title: "Admin · Lawyers — LegalDesk AI" };
export const dynamic = "force-dynamic";

const tabs = [
  { href: "/admin/lawyers", label: "Lawyer queue" },
  { href: "/admin/leads", label: "Lead queue" }
];

export default async function AdminLawyersPage() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    if (gate.reason === "unauthenticated") redirect("/auth/login?next=/admin/lawyers");
    return (
      <DashboardShell eyebrow="Admin" title="Lawyer verification queue" maxWidth="md">
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Access denied ({gate.reason}).
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      eyebrow="Admin"
      title="Lawyer verification queue"
      description="Founder-only. Review the Bar Council ID and Razorpay Route account before approving. Suspensions require a written reason and cascade to the application audit row."
      tabs={tabs}
      activeHref="/admin/lawyers"
      maxWidth="xl"
    >
      {gate.mock ? (
        <div className="rounded-xl border border-accent-200 bg-accent-50 p-3 text-xs text-ink-900">
          Running in mock mode. The queue will be empty until Supabase is configured and
          at least one lawyer applies.
        </div>
      ) : null}
      <LawyerQueue />
    </DashboardShell>
  );
}
