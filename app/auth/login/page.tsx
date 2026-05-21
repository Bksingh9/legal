import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { AuthShell } from "@/components/landing/auth-shell";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Sign in — LegalDesk AI" };

export default async function LoginPage({
  searchParams
}: {
  searchParams: { next?: string; error?: string };
}) {
  const next = searchParams.next ?? "/triage";

  const supa = getSupabaseServerClient();
  if (supa) {
    const {
      data: { user }
    } = await supa.auth.getUser();
    if (user) redirect(next);
  }

  return (
    <AuthShell
      title="Welcome back"
      description="We send a one-time link to your email. No password to remember."
      footer={
        <>
          New here?{" "}
          <Link
            href={`/auth/signup${next !== "/triage" ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="text-accent-400 underline underline-offset-4"
          >
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm next={next} />
      <p className="mt-4 text-xs text-ink-400">
        Heads up: the free-tier mailer is rate-limited to 3 emails per hour. If you see
        &quot;email rate limit exceeded&quot;, wait an hour or use a different address.
      </p>
      {searchParams.error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Sign-in failed ({searchParams.error}). Try again.
        </p>
      ) : null}
      {!supa ? (
        <p className="mt-4 rounded-lg border border-accent-200 bg-accent-50 p-3 text-xs text-ink-900">
          Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_ANON_KEY to enable email sign-in.
        </p>
      ) : null}
    </AuthShell>
  );
}
