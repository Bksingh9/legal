import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold">Sign in to LegalDesk AI</h1>
      <p className="mt-2 text-sm text-neutral-600">
        We send a one-time link to your email. No password.
      </p>
      <div className="mt-6">
        <LoginForm next={next} />
      </div>
      <p className="mt-3 text-xs text-neutral-500">
        Heads up: the free-tier mailer is rate-limited to 3 emails per
        hour. If you see &quot;email rate limit exceeded&quot;, wait an
        hour or use a different address.
      </p>
      {searchParams.error ? (
        <p className="mt-4 text-sm text-red-600">
          Sign-in failed ({searchParams.error}). Try again.
        </p>
      ) : null}
      {!supa ? (
        <p className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_ANON_KEY to enable email sign-in.
        </p>
      ) : null}
    </main>
  );
}
