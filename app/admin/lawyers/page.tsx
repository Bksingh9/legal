import { redirect } from "next/navigation";
import { LawyerQueue } from "@/components/admin/lawyer-queue";
import { requireAdmin } from "@/lib/admin/role";

export const metadata = { title: "Admin · Lawyers — LegalDesk AI" };
export const dynamic = "force-dynamic";

export default async function AdminLawyersPage() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    if (gate.reason === "unauthenticated") redirect("/auth/login?next=/admin/lawyers");
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-12">
        <h1 className="text-2xl font-semibold">Admin · Lawyers</h1>
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          Access denied ({gate.reason}).
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-wide text-neutral-500">Admin</p>
        <h1 className="text-2xl font-semibold">Lawyer verification queue</h1>
        <p className="text-sm text-neutral-600">
          Founder-only. Review the Bar Council ID and Razorpay Route account
          before approving. Suspensions require a written reason and cascade to
          the application audit row.
        </p>
        {gate.mock ? (
          <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            Running in mock mode. The queue will be empty until Supabase is
            configured and at least one lawyer applies.
          </p>
        ) : null}
      </header>
      <LawyerQueue />
    </main>
  );
}
