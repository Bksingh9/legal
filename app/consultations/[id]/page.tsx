import { notFound, redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getConsultationById } from "@/lib/consult/persistence";
import { ConsultationRoom } from "@/components/consult/consultation-room";

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
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12">
      <header>
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          Consultation · {c.pack ?? "—"} · {c.specialization ?? "—"}
        </p>
        <h1 className="text-2xl font-semibold">Consultation waiting room</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Status updates live as the lawyer accepts and the call gets ready.
        </p>
      </header>

      <ConsultationRoom
        consultationId={c.id}
        initialStatus={c.status}
        initialJitsiUrl={c.jitsi_room_url ?? null}
        initialChannel={c.type}
      />
    </main>
  );
}
