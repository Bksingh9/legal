import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/triage/persistence";
import {
  getConsultationById,
  markStarted,
  getLawyerByUserId
} from "@/lib/consult/persistence";
import { connectMaskedCall } from "@/lib/exotel/client";
import { createRoom, signRoomAuthToken } from "@/lib/hms/client";
import { getUserContact } from "@/lib/users/persistence";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: "Sign in." }, { status: 401 });
    }
    return NextResponse.json({
      ok: true,
      mock: true,
      channel: "video",
      hms_room_id: "room_mock",
      hms_auth_token: "auth_mock_room_mock_host"
    });
  }

  const c = await getConsultationById(params.id);
  if (!c) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // Either party (user or assigned lawyer) can trigger start, but only
  // after both consent flags are set. Either being false short-circuits
  // recording but does NOT block the call itself - the call proceeds
  // un-recorded per spec §1 ("If either declines, record nothing.").
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

  if (c.type === "video") {
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
      recording,
      hms_room_id: room.room_id,
      hms_auth_token: token,
      role
    });
  }

  // call channel — Exotel masked outbound dial
  const userContact = await getUserContact(c.user_id);
  // For mock mode without a lawyer phone lookup wired, we dial a placeholder.
  // Production: pull lawyer phone from users table joined via lawyers.user_id.
  const lawyerPhone = "+910000000000";
  const userPhone = userContact?.phone ?? "+910000000000";
  const call = await connectMaskedCall({
    from_phone: userPhone,
    to_phone: lawyerPhone,
    record: recording
  });
  await markStarted({
    consultationId: c.id,
    channelMeta: { exotel_call_sid: call.call_sid }
  });
  return NextResponse.json({
    ok: true,
    channel: "call",
    recording,
    exotel_call_sid: call.call_sid,
    status: call.status
  });
}
