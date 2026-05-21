import { notFound, redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getConsultationById } from "@/lib/consult/persistence";
import { ConsultationRoom } from "@/components/consult/consultation-room";
import { DashboardShell } from "@/components/landing/dashboard-shell";

export const dynamic = "force-dynamic";

export default async function ConsultationPage({
  params
}: {
  params: { id: string };
}) {
  const supa = getSupabaseServerClient();
  if (supa) {
    const {
      data: { user }
    } = await supa.auth.getUser();
    if (!user) redirect(`/auth/login?next=/consultations/${params.id}`);
  }

  const c = await getConsultationById(params.id);
  if (!c) notFound();

  return (
    <DashboardShell
      eyebrow={`Consultation · ${c.pack ?? "—"} · ${c.specialization ?? "—"}`}
      title="Consultation waiting room"
      description="Status updates live as the lawyer accepts and the call gets ready."
      maxWidth="lg"
    >
      <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm md:p-8">
        <ConsultationRoom
          consultationId={c.id}
          initialStatus={c.status}
          initialJitsiUrl={c.jitsi_room_url ?? null}
          initialChannel={c.type}
        />
      </div>
    </DashboardShell>
  );
}
