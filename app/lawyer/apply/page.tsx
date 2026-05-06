import { redirect } from "next/navigation";
import { LawyerApplyForm } from "@/components/lawyer/apply-form";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Apply as a lawyer — LegalDesk AI" };

export default async function LawyerApplyPage() {
  const supa = getSupabaseServerClient();
  let mockMode = !supa;
  if (supa) {
    const {
      data: { user }
    } = await supa.auth.getUser();
    if (!user) redirect("/auth/login?next=/lawyer/apply");
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          Lawyer onboarding
        </p>
        <h1 className="text-2xl font-semibold">Apply to take consultations on LegalDesk</h1>
        <p className="text-sm text-neutral-600">
          We will not display your name, photo, or testimonials anywhere on the
          platform. BCI Rule 36 compliance: matching is based on specialization,
          language, state, years of practice and an anonymous quality rating only.
        </p>
      </header>

      {mockMode ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          Running in mock mode. Form submissions are accepted but not persisted
          until Supabase is configured.
        </p>
      ) : null}

      <LawyerApplyForm />
    </main>
  );
}
