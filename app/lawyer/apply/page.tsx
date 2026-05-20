import { LawyerApplyForm } from "@/components/lawyer/apply-form";
import { PageHeader } from "@/components/landing/page-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Apply as an advocate — LegalDesk AI",
  description:
    "Join the LegalDesk verified advocate panel. BCI Rule 36 compliant matching, UPI payouts, browser-native calls. Apply in 5 minutes — no prior account needed."
};

const perks = [
  "Anonymous matching — no name, photo, or testimonials shown",
  "UPI payouts, weekly settlement, fully Indian rails",
  "Browser-native calls — no app to install for you or the client",
  "Decline freely; offers expire if not accepted in 15 minutes",
  "Set your own rate floor and availability windows"
];

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
    <main>
      <PageHeader
        eyebrow="Advocate onboarding"
        title="Take consultations on LegalDesk."
        description="BCI Rule 36 compliant — no advertising, no named profiles. Matching uses specialization, language, state, years of practice, and an anonymous internal rating only."
      />

      <section className="bg-white py-16 md:py-20">
        <div className="container max-w-5xl">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm md:p-8">
              {!signedIn ? (
                <p className="mb-6 rounded-xl border border-brand-100 bg-brand-50 p-3 text-xs text-brand-700">
                  No account needed to apply. After you submit, we&apos;ll email a
                  sign-in link so you can open your dashboard, see offers as they
                  arrive, and manage availability.
                </p>
              ) : null}
              <LawyerApplyForm />
            </div>
            <aside className="rounded-2xl border border-ink-100 bg-ink-50/60 p-6">
              <p className="font-medium text-ink-900">Why advocates join</p>
              <ul className="mt-4 space-y-3 text-sm text-ink-700">
                {perks.map((p) => (
                  <li key={p} className="flex gap-2.5">
                    <CheckCircle2
                      size={16}
                      className="mt-0.5 shrink-0 text-brand-600"
                    />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
