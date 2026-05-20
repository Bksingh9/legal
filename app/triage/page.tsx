import { TriageChat } from "@/components/triage/triage-chat";
import { PageHeader } from "@/components/landing/page-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Shield, Zap, FileDown } from "lucide-react";

export const metadata = {
  title: "AI triage — LegalDesk AI",
  description: "Plain-language triage for Indian legal situations."
};

// Triage is intentionally public — anyone can try it once without
// signing up. The API persists the query only when an authenticated
// user is present (graceful no-op otherwise). The "save to your inbox"
// + "book a lawyer call" CTAs after the result are what gate auth.
export default async function TriagePage() {
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
        eyebrow="Free AI triage"
        title="Tell us what happened."
        description="We return a one-page Case Prep with the likely legal framework and the next three steps. About 60 seconds. Not legal advice."
      />

      <section className="bg-white py-16 md:py-20">
        <div className="container max-w-3xl">
          {!signedIn ? (
            <div className="mb-8 flex items-start gap-3 rounded-2xl border border-ink-100 bg-ink-50/60 p-4 text-sm text-ink-700">
              <Zap size={16} className="mt-0.5 shrink-0 text-accent-500" />
              <p>
                Try it now — no sign-up needed. Sign in only when you want to save
                the result, generate a document, or talk to a lawyer.
              </p>
            </div>
          ) : null}

          <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm md:p-8">
            <TriageChat />
          </div>

          <ul className="mt-10 grid gap-4 text-sm text-ink-700 md:grid-cols-3">
            <li className="flex items-start gap-3 rounded-xl bg-ink-50/60 p-4">
              <Shield size={18} className="mt-0.5 shrink-0 text-brand-600" />
              <span>
                <span className="font-medium text-ink-900">Private.</span> Your text
                is stored in Mumbai and deletable from /account at any time.
              </span>
            </li>
            <li className="flex items-start gap-3 rounded-xl bg-ink-50/60 p-4">
              <FileDown size={18} className="mt-0.5 shrink-0 text-brand-600" />
              <span>
                <span className="font-medium text-ink-900">Portable.</span> Download
                the result as a PDF and share it with anyone.
              </span>
            </li>
            <li className="flex items-start gap-3 rounded-xl bg-ink-50/60 p-4">
              <Zap size={18} className="mt-0.5 shrink-0 text-brand-600" />
              <span>
                <span className="font-medium text-ink-900">Actionable.</span> Each
                result links to the right document or advocate match.
              </span>
            </li>
          </ul>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
