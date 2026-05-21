import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { AuthShell } from "@/components/landing/auth-shell";

export const metadata = { title: "Forgot password — LegalDesk AI" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      description="Enter your email; we'll send a reset link from no-reply@supabase.co (Supabase's built-in mailer)."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/auth/login" className="text-accent-400 underline underline-offset-4">
            Back to sign in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
