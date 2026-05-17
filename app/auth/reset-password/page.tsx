import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata = { title: "Set new password — LegalDesk AI" };
// Recovery flow: Supabase sends the user here from the reset email,
// already signed in via a temporary recovery session. The page asks
// for a new password and calls supabase.auth.updateUser({ password }).

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold">Set a new password</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Choose any 6+ character password. Stays the same across devices.
      </p>
      <div className="mt-6">
        <ResetPasswordForm />
      </div>
    </main>
  );
}
