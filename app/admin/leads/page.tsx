import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/role";
import { AdminLeadsTable } from "@/components/admin/leads-table";

export const metadata = { title: "Lead queue — LegalDesk admin" };
export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    if (gate.reason === "unauthenticated") {
      redirect("/auth/login?next=/admin/leads");
    }
    redirect("/");
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-12">
      <header>
        <p className="text-xs uppercase tracking-wide text-neutral-500">Admin</p>
        <h1 className="text-2xl font-semibold">Lead queue</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Call-back leads from <code>/talk-to-lawyer</code>. Mark as
          called once you&apos;ve reached them. Drop if irrelevant.
        </p>
      </header>
      <AdminLeadsTable />
    </main>
  );
}
