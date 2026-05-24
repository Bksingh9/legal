import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/role";
import { AdminLeadsTable } from "@/components/admin/leads-table";
import { DashboardShell } from "@/components/landing/dashboard-shell";

export const metadata = { title: "Lead queue — LegalDesk admin" };
export const dynamic = "force-dynamic";

const tabs = [
  { href: "/admin/lawyers", label: "Lawyer queue" },
  { href: "/admin/leads", label: "Lead queue" },
  { href: "/admin/orgs", label: "Organizations" }
];

export default async function AdminLeadsPage() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    if (gate.reason === "unauthenticated") {
      redirect("/auth/login?next=/admin/leads");
    }
    redirect("/");
  }

  return (
    <DashboardShell
      eyebrow="Admin"
      title="Lead queue"
      description="Call-back leads from /talk-to-lawyer. Mark as called once you've reached them. Drop if irrelevant."
      tabs={tabs}
      activeHref="/admin/leads"
      maxWidth="xl"
    >
      <AdminLeadsTable />
    </DashboardShell>
  );
}
