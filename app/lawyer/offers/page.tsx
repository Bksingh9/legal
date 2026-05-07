import { redirect } from "next/navigation";
import { LawyerOffersList } from "@/components/lawyer/offers-list";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Pending offers — LegalDesk AI" };
export const dynamic = "force-dynamic";

export default async function LawyerOffersPage() {
  const supa = getSupabaseServerClient();
  if (supa) {
    const {
      data: { user }
    } = await supa.auth.getUser();
    if (!user) redirect("/auth/login?next=/lawyer/offers");
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12">
      <header>
        <p className="text-xs uppercase tracking-wide text-neutral-500">Lawyer dashboard</p>
        <h1 className="text-2xl font-semibold">Pending offers</h1>
        <p className="mt-2 text-sm text-neutral-600">
          First-come, first-served. Sibling offers expire automatically once
          you accept.
        </p>
      </header>
      <LawyerOffersList />
    </main>
  );
}
