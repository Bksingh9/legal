import { redirect } from "next/navigation";
import { DpdpControls } from "@/components/account/dpdp-controls";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Your data — LegalDesk AI" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supa = getSupabaseServerClient();
  let mockMode = !supa;
  if (supa) {
    const {
      data: { user }
    } = await supa.auth.getUser();
    if (!user) redirect("/auth/login?next=/account");
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <header>
        <p className="text-xs uppercase tracking-wide text-neutral-500">Your data</p>
        <h1 className="text-2xl font-semibold">Access, correction, erasure</h1>
        <p className="mt-2 text-sm text-neutral-600">
          DPDP Act 2023 rights. Export, correct or erase your data at any
          time. We log every action against the audit trail.
        </p>
      </header>

      {mockMode ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          Running in mock mode. Actions return stub responses without a
          configured Supabase project.
        </p>
      ) : null}

      <DpdpControls />
    </main>
  );
}
