import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";
import { GoogleButton } from "@/components/auth/google-button";
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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold">Create your LegalDesk account</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Use Google or set up an email + password. You can always switch
        sign-in methods later.
      </p>
      <div className="mt-6 flex flex-col gap-4">
        <GoogleButton next={next} label="Sign up with Google" />
        <div className="flex items-center gap-2 text-xs text-ink-400">
          <span className="h-px flex-1 bg-ink-100" />
          or
          <span className="h-px flex-1 bg-ink-100" />
        </div>
        <SignupForm next={next} />
      </div>
    </main>
  );
}
