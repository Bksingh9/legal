import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { AuthShell } from "@/components/landing/auth-shell";

export const metadata = { title: "Set new password — LegalDesk AI" };
// Recovery flow: Supabase sends the user here from the reset email,
// already signed in via a temporary recovery session. The page asks
// for a new password and calls supabase.auth.updateUser({ password }).

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Set a new password"
      description="Choose any 6+ character password. Stays the same across devices."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
