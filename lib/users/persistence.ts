import { getSupabaseServiceClient } from "@/lib/supabase/server";

export interface UserContact {
  email: string | null;
  phone: string | null;
  name: string | null;
}

export async function getUserContact(userId: string): Promise<UserContact | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;
  const { data, error } = await supa
    .from("users")
    .select("email, phone, name")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("[users] getUserContact", error);
    return null;
  }
  return (data as UserContact) ?? null;
}

// Looks up the contact for the auth user behind a given lawyer row.
export async function getLawyerContact(lawyerId: string): Promise<UserContact | null> {
  const supa = getSupabaseServiceClient();
  if (!supa) return null;
  const { data, error } = await supa
    .from("lawyers")
    .select("user_id")
    .eq("id", lawyerId)
    .maybeSingle();
  if (error || !data?.user_id) return null;
  return getUserContact(data.user_id as string);
}
