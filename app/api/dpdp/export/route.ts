import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/triage/persistence";
import { exportUserData } from "@/lib/dpdp/persistence";

export const runtime = "nodejs";

// GET returns the export inline (handy for the /account page); POST
// returns it as an attachment for download.
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: "Sign in." }, { status: 401 });
    }
    return NextResponse.json({ ok: true, mock: true, export: null });
  }
  const data = await exportUserData(userId);
  return NextResponse.json({ ok: true, export: data });
}

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: "Sign in." }, { status: 401 });
    }
    return NextResponse.json({ ok: true, mock: true });
  }
  const data = await exportUserData(userId);
  const body = JSON.stringify(data ?? {}, null, 2);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="legaldesk-export-${userId.slice(0, 8)}.json"`
    }
  });
}
