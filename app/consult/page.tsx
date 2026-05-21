import { redirect } from "next/navigation";
import { BookConsultForm } from "@/components/consult/book-form";
import { DashboardShell } from "@/components/landing/dashboard-shell";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Talk to a lawyer — LegalDesk AI" };
export const dynamic = "force-dynamic";

export default async function ConsultPage() {
  const supa = getSupabaseServerClient();
  const mockMode = !supa;
  if (supa) {
    const {
      data: { user }
    } = await supa.auth.getUser();
    if (!user) redirect("/auth/login?next=/consult");
  }

  return (
    <DashboardShell
      eyebrow="Consultation · Tier 3"
      title="Talk to a lawyer"
      description="We'll find a verified advocate matching your specialization, language, and state, fan out to the top three by availability and rating, and assign whoever accepts first. Target match time: under four hours."
      maxWidth="lg"
    >
      {mockMode ? (
        <div className="rounded-xl border border-accent-200 bg-accent-50 p-3 text-xs text-ink-900">
          Running in mock mode. The matcher returns no advocates without a configured
          Supabase + verified lawyer rows.
        </div>
      ) : null}

      <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm md:p-8">
        <BookConsultForm />
      </div>
    </DashboardShell>
  );
}
