import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/triage/persistence";
import { getLawyerSelfView } from "@/lib/lawyers/persistence";

export const metadata = { title: "Lawyer dashboard — LegalDesk AI" };
export const dynamic = "force-dynamic";

export default async function LawyerDashboardPage() {
  const supa = getSupabaseServerClient();
  if (supa) {
    const {
      data: { user }
    } = await supa.auth.getUser();
    if (!user) redirect("/auth/login?next=/lawyer");
  }

  const userId = await getCurrentUserId();
  const me = userId ? await getLawyerSelfView(userId) : null;

  if (!me) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
        <h1 className="text-2xl font-semibold">Lawyer dashboard</h1>
        <p className="text-sm text-neutral-600">
          You don&apos;t have an active lawyer profile yet.
        </p>
        <Link
          href="/lawyer/apply"
          className="self-start rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
        >
          Apply to onboard
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <header>
        <p className="text-xs uppercase tracking-wide text-neutral-500">Lawyer dashboard</p>
        <h1 className="text-2xl font-semibold">Your application</h1>
      </header>

      <section className="rounded-md border border-neutral-200 p-4">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <Row label="Reference" value={me.anon_slug} />
          <Row label="Status" value={me.status} />
          <Row label="Bar Council ID" value={me.bar_council_id} />
          <Row label="State" value={me.state} />
          <Row label="Years of practice" value={String(me.years_exp)} />
          <Row label="Specializations" value={me.specializations.join(", ")} />
          <Row label="Languages" value={me.languages.join(", ")} />
          <Row label="Razorpay Route" value={me.route_account_id ?? "pending"} />
        </dl>
        {me.status === "pending" ? (
          <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            Manual review takes up to 48 hours. We&apos;ll email you when the
            verification is complete.
          </p>
        ) : null}
        {me.status === "suspended" && me.suspension_reason ? (
          <p className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-900">
            Suspended: {me.suspension_reason}
          </p>
        ) : null}
      </section>

      <Link
        href="/lawyer/apply"
        className="self-start text-sm text-neutral-700 underline"
      >
        Update application
      </Link>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </>
  );
}
