import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";
import { GoogleButton } from "@/components/auth/google-button";
import { AuthShell } from "@/components/landing/auth-shell";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Create an account — LegalDesk AI" };

export default async function SignupPage({
  searchParams
}: {
  searchParams: { next?: string };
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
      title="Create your account"
      description="Use Google or set up an email + password. You can always switch sign-in methods later."
      footer={
        <>
          Already have one?{" "}
          <Link
            href={`/auth/login${next !== "/triage" ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="text-accent-400 underline underline-offset-4"
          >
            Sign in
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <GoogleButton next={next} label="Sign up with Google" />
        <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-night-100/60">
          <span className="h-px flex-1 bg-white/15" />
          or
          <span className="h-px flex-1 bg-white/15" />
        </div>
        <SignupForm next={next} />
      </div>
    </AuthShell>
  );
}
