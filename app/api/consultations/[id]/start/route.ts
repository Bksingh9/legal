import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/triage/persistence";
import {
  getConsultationById,
  markStarted,
  getLawyerByUserId
} from "@/lib/consult/persistence";
import { connectMaskedCall, EXOTEL_ENABLED } from "@/lib/exotel/client";
import { createRoom, signRoomAuthToken, HMS_ENABLED } from "@/lib/hms/client";
import { getUserContact, getLawyerContact } from "@/lib/users/persistence";
import { roomUrlFor } from "@/lib/jitsi/room";
import { notifyUser } from "@/lib/notify/inbox";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const userId = await getCurrentUserId();
  if (!userId) {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: "Sign in." }, { status: 401 });
    }
    return NextResponse.json({
      ok: true,
      mock: true,
      channel: "video",
      jitsi_room_url: roomUrlFor("mock")
    });
  }

  const c = await getConsultationById(params.id);
  if (!c) return NextResponse.json({ error: "Not found." }, { status: 404 });

  let who: "user" | "lawyer" | null = null;
  if (c.user_id === userId) who = "user";
  else {
    const lw = await getLawyerByUserId(userId);
    if (lw && lw.id === c.lawyer_id) who = "lawyer";
  }
  if (!who) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  if (c.recording_consent_user === null || c.recording_consent_lawyer === null) {
    return NextResponse.json(
      { error: "Both parties must record their consent first." },
      { status: 409 }
    );
  }
  const recording =
    c.recording_consent_user === true && c.recording_consent_lawyer === true;

  // Notify the other party that the consultation is starting now.
  const otherPartyUserId = who === "user" ? await lawyerUserIdFor(c.lawyer_id) : c.user_id;
  if (otherPartyUserId) {
    await notifyUser({
      userId: otherPartyUserId,
      kind: "consultation.starting",
      title: "Your consultation is starting",
      body: "The other party just opened the call. Join now.",
      link: `/consultations/${c.id}`
    });
  }

  // Video channel: prefer HMS when keys are wired, else Jitsi public meet.
  if (c.type === "video") {
    if (HMS_ENABLED) {
      const room = await createRoom({
        name: `consult-${c.id}`,
        description: `LegalDesk consult ${c.id}`,
        recording
      });
      await markStarted({
        consultationId: c.id,
        channelMeta: { hms_room_id: room.room_id }
      });
      const role = who === "lawyer" ? "host" : "guest";
      const token = signRoomAuthToken({
        user_id: userId,
        room_id: room.room_id,
        role
      });
      return NextResponse.json({
        ok: true,
        channel: "video",
        provider: "hms",
        recording,
        hms_room_id: room.room_id,
        hms_auth_token: token,
        role
      });
    }

    // Tier-0 fallback: Jitsi public meet. Deterministic room URL per
    // consultation; both parties open the same URL and meet.
    const jitsiUrl = roomUrlFor(c.id);
    await markStarted({
      consultationId: c.id,
      channelMeta: { jitsi_room_url: jitsiUrl }
    });
    return NextResponse.json({
      ok: true,
      channel: "video",
      provider: "jitsi",
      recording,
      jitsi_room_url: jitsiUrl
    });
  }

  // Call channel: real Exotel masked dial when keys are wired, else
  // Tier-0 falls back to Jitsi audio (same room URL — user joins with
  // camera off). This preserves the "no telephony key needed" promise.
  if (!EXOTEL_ENABLED) {
    const jitsiUrl = roomUrlFor(c.id);
    await markStarted({
      consultationId: c.id,
      channelMeta: { jitsi_room_url: jitsiUrl }
    });
    return NextResponse.json({
      ok: true,
      channel: "call",
      provider: "jitsi",
      recording,
      jitsi_room_url: jitsiUrl
    });
  }

  const userContact = await getUserContact(c.user_id);
  const lawyerContact = c.lawyer_id ? await getLawyerContact(c.lawyer_id) : null;
  if (!userContact?.phone || !lawyerContact?.phone) {
    return NextResponse.json(
      { error: "Phone numbers missing for masked call. Switch to video to continue." },
      { status: 409 }
    );
  }
  const call = await connectMaskedCall({
    from_phone: userContact.phone,
    to_phone: lawyerContact.phone,
    record: recording
  });
  await markStarted({
    consultationId: c.id,
    channelMeta: { exotel_call_sid: call.call_sid }
  });
  return NextResponse.json({
    ok: true,
    channel: "call",
    provider: "exotel",
    recording,
    exotel_call_sid: call.call_sid,
    status: call.status
  });
}

async function lawyerUserIdFor(lawyerId: string | null): Promise<string | null> {
  if (!lawyerId) return null;
  const supa = getSupabaseServiceClient();
  if (!supa) return null;
  const { data } = await supa
    .from("lawyers")
    .select("user_id")
    .eq("id", lawyerId)
    .maybeSingle();
  return (data?.user_id as string | undefined) ?? null;
}
