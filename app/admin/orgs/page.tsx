import { redirect } from "next/navigation";
import { OrgManager } from "@/components/admin/org-manager";
import { DashboardShell } from "@/components/landing/dashboard-shell";
import { requireAdmin } from "@/lib/admin/role";

export const metadata = { title: "Admin · Organizations — LegalDesk AI" };
export const dynamic = "force-dynamic";

const tabs = [
  { href: "/admin/lawyers", label: "Lawyer queue" },
  { href: "/admin/leads", label: "Lead queue" },
  { href: "/admin/orgs", label: "Organizations" }
];

export default async function AdminOrgsPage() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    if (gate.reason === "unauthenticated") redirect("/auth/login?next=/admin/orgs");
    return (
      <DashboardShell eyebrow="Admin" title="B2B organizations" maxWidth="md">
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Access denied ({gate.reason}).
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      eyebrow="Admin"
      title="B2B organizations"
      description="Tier 5 LegalDesk for Business. Create orgs, set plans + monthly document quotas, and mint scoped API keys for the /api/v1 surface. Key tokens are shown once at creation and stored only as a hash."
      tabs={tabs}
      activeHref="/admin/orgs"
      maxWidth="xl"
    >
      {gate.mock ? (
        <div className="rounded-xl border border-accent-200 bg-accent-50 p-3 text-xs text-ink-900">
          Running in mock mode. Configure Supabase to persist organizations and keys.
        </div>
      ) : null}
      <OrgManager />
    </DashboardShell>
  );
}
