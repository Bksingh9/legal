import { LawyerApplyForm } from "@/components/lawyer/apply-form";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Apply as an advocate — LegalDesk AI",
  description:
    "Join the LegalDesk verified advocate panel. BCI Rule 36 compliant matching, UPI payouts, browser-native calls. Apply in 5 minutes — no prior account needed."
};

// Public page — anonymous advocates can submit the form. The API
// provisions an auth user from the contact email and emails a magic
// link they use later to sign in to their dashboard.
export default async function LawyerApplyPage() {
  const supa = getSupabaseServerClient();
  let signedIn = false;
  if (supa) {
    const {
      data: { user }
    } = await supa.auth.getUser();
    signedIn = Boolean(user);
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          Advocate onboarding
        </p>
        <h1 className="text-2xl font-semibold">Apply to take consultations on LegalDesk</h1>
        <p className="text-sm text-neutral-600">
          We never display your name, photo, or testimonials. BCI Rule 36
          compliant — matching uses specialization, language, state, years
          of practice and an anonymous internal rating only.
        </p>
      </header>

      {!signedIn ? (
        <p className="rounded-md border border-brand-200 bg-brand-50 p-3 text-xs text-brand-900">
          No account needed to apply. After you submit, we&apos;ll email a
          sign-in link so you can open your dashboard, see offers as they
          arrive, and manage availability.
        </p>
      ) : null}

      <LawyerApplyForm />
    </main>
  );
}
