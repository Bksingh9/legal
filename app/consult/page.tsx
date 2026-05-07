import { redirect } from "next/navigation";
import { BookConsultForm } from "@/components/consult/book-form";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Talk to a lawyer — LegalDesk AI" };
export const dynamic = "force-dynamic";

export default async function ConsultPage() {
  const supa = getSupabaseServerClient();
  let mockMode = !supa;
  if (supa) {
    const {
      data: { user }
    } = await supa.auth.getUser();
    if (!user) redirect("/auth/login?next=/consult");
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12">
      <header>
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          Tier 3 · Consultation
        </p>
        <h1 className="text-2xl font-semibold">Talk to a lawyer</h1>
        <p className="mt-2 text-sm text-neutral-600">
          We will find a verified advocate matching your specialization,
          language and state, fan out to the top three by availability and
          rating, and assign whoever accepts first. Target match time: under
          four hours.
        </p>
      </header>

      {mockMode ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          Running in mock mode. The matcher returns no advocates without a
          configured Supabase + verified lawyer rows.
        </p>
      ) : null}

      <BookConsultForm />
    </main>
  );
}
