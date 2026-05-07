import { redirect } from "next/navigation";
import { ReferralCard } from "@/components/referrals/code-card";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Referrals — LegalDesk AI" };
export const dynamic = "force-dynamic";

export default async function ReferralsPage() {
  const supa = getSupabaseServerClient();
  if (supa) {
    const {
      data: { user }
    } = await supa.auth.getUser();
    if (!user) redirect("/auth/login?next=/referrals");
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <header>
        <p className="text-xs uppercase tracking-wide text-neutral-500">Refer friends</p>
        <h1 className="text-2xl font-semibold">Earn wallet credit for every friend.</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Share your code. We credit your wallet on signup and again when
          they complete their first paid transaction. No cap.
        </p>
      </header>
      <ReferralCard />
    </main>
  );
}
