import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/landing/dashboard-shell";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/triage/persistence";
import { getLawyerSelfView } from "@/lib/lawyers/persistence";

export const metadata = { title: "Lawyer dashboard — LegalDesk AI" };
export const dynamic = "force-dynamic";

const tabs = [
  { href: "/lawyer", label: "Application" },
  { href: "/lawyer/offers", label: "Pending offers" }
];

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
      <DashboardShell
        eyebrow="Lawyer dashboard"
        title="No active profile yet"
        description="You haven't completed your onboarding application. Once we verify your Bar Council ID and your panel preferences, your dashboard fills in."
        maxWidth="md"
      >
        <Link
          href="/lawyer/apply"
          className="inline-flex h-11 items-center rounded-full bg-night-900 px-6 text-sm font-medium text-white transition hover:bg-night-700"
        >
          Apply to onboard
        </Link>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      eyebrow="Lawyer dashboard"
      title="Your application"
      description="Anonymous reference, verification status, and panel configuration."
      tabs={tabs}
      activeHref="/lawyer"
      actions={
        <Link
          href="/lawyer/apply"
          className="text-sm text-ink-700 underline underline-offset-4 hover:text-ink-900"
        >
          Update application
        </Link>
      }
      maxWidth="md"
    >
      <div className="rounded-2xl border border-ink-100 bg-white p-6">
        <dl className="grid gap-px overflow-hidden rounded-xl border border-ink-100 bg-ink-100 text-sm sm:grid-cols-2">
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
          <p className="mt-4 rounded-xl border border-accent-200 bg-accent-50 p-3 text-xs text-ink-900">
            Manual review takes up to 48 hours. We&apos;ll email you when verification completes.
          </p>
        ) : null}
        {me.status === "suspended" && me.suspension_reason ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            Suspended: {me.suspension_reason}
          </p>
        ) : null}
      </div>
    </DashboardShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 bg-white p-4 md:flex-row md:items-baseline md:justify-between">
      <dt className="text-xs uppercase tracking-wider text-ink-400">{label}</dt>
      <dd className="text-sm font-medium tabular-nums text-ink-900">{value}</dd>
    </div>
  );
}
