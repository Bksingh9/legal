"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface Props {
  next: string;
  label?: string;
}

export function GoogleButton({ next, label = "Continue with Google" }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    const supa = getSupabaseBrowserClient();
    if (!supa) {
      setBusy(false);
      setError("Auth is not configured in this environment.");
      return;
    }
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: oauthError } = await supa.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo }
    });
    if (oauthError) {
      setBusy(false);
      // Supabase returns "provider is not enabled" when Google OAuth
      // isn't wired in the project. Show a helpful message.
      const msg = /provider.*not enabled/i.test(oauthError.message)
        ? "Google sign-in isn't configured yet on this project."
        : oauthError.message;
      setError(msg);
    }
    // On success the browser is redirected to Google; nothing to do here.
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-ink-200 bg-white px-4 text-sm font-medium text-ink-900 transition-colors hover:bg-ink-50 disabled:opacity-60"
      >
        <GoogleLogo />
        {busy ? "Redirecting…" : label}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.5 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.2c-2 1.5-4.6 2.4-7.3 2.4-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.5 39.5 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.6l.001-.001 6.3 5.2C37.1 38.6 44 33.9 44 24c0-1.3-.1-2.4-.4-3.5z"/>
    </svg>
  );
}
