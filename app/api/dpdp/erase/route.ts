import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/triage/persistence";
import { eraseUser } from "@/lib/dpdp/persistence";

export const runtime = "nodejs";

// We require the literal phrase "DELETE MY ACCOUNT" as a confirmation
// guard so an accidental POST cannot tombstone the user. The phrase
// matches the visible button copy on /account so the UI and API are
// in sync.
const Body = z.object({
  confirm: z.literal("DELETE MY ACCOUNT")
});

export async function POST(req: Request) {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json(
      { error: "Confirmation phrase mismatch." },
      { status: 400 }
    );
  }
  // parsed.confirm is verified by the schema; the variable is referenced
  // here so noUnusedLocals does not complain.
  void parsed.confirm;

  const userId = await getCurrentUserId();
  if (!userId) {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: "Sign in." }, { status: 401 });
    }
    return NextResponse.json({ ok: true, mock: true });
  }

  const ok = await eraseUser(userId);
  if (!ok) return NextResponse.json({ error: "Erase failed." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
