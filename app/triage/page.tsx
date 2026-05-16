import { TriageChat } from "@/components/triage/triage-chat";
import { getSupabaseServerClient } from "@/lib/supabase/server";

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
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <header>
        <h1 className="text-2xl font-semibold">Tell us what happened.</h1>
        <p className="mt-2 text-sm text-neutral-600">
          We will return a one-page Case Prep with the likely legal framework
          and the next three steps. This is not legal advice.
        </p>
      </header>

      {!signedIn ? (
        <p className="rounded-md border border-ink-100 bg-ink-50 p-3 text-xs text-ink-700">
          Try it now — no sign-up needed. Sign in only when you want to save
          the result, generate a document, or talk to a lawyer.
        </p>
      ) : null}

      <TriageChat />
    </main>
  );
}
