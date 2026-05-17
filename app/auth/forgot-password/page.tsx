import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = { title: "Forgot password — LegalDesk AI" };

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold">Reset your password</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Enter your email; we&apos;ll send a reset link from
        no-reply@supabase.co (Supabase&apos;s built-in mailer).
      </p>
      <div className="mt-6">
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
