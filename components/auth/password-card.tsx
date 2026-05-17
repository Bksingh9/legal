"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface Identity {
  provider: string;
}

// Account-side password management. Lets a signed-in user set or
// change a password without losing their magic-link / Google linkage.
// Also surfaces which identity providers are wired on their account.
export function PasswordCard() {
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const supa = getSupabaseBrowserClient();
      if (!supa) return;
      const {
        data: { user }
      } = await supa.auth.getUser();
      const list = (user?.identities ?? []) as Array<{ provider: string }>;
      setIdentities(list.map((i) => ({ provider: i.provider })));
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    setMessage(null);
    if (password.length < 6) {
      setState("error");
      setMessage("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setState("error");
      setMessage("Passwords do not match.");
      return;
    }
    const supa = getSupabaseBrowserClient();
    if (!supa) {
      setState("error");
      setMessage("Auth is not configured.");
      return;
    }
    const { error } = await supa.auth.updateUser({ password });
    if (error) {
      setState("error");
      setMessage(error.message);
      return;
    }
    setState("done");
    setMessage("Password updated.");
    setPassword("");
    setConfirm("");
  }

  const hasPasswordIdentity = identities.some((i) => i.provider === "email");
  const linked = identities.map((i) => i.provider).join(", ") || "—";

  return (
    <section className="flex flex-col gap-4 rounded-md border border-ink-100 p-5">
      <header>
        <p className="text-xs uppercase tracking-wide text-ink-400">Sign-in</p>
        <h2 className="text-lg font-semibold text-ink-900">
          {hasPasswordIdentity ? "Change password" : "Set a password"}
        </h2>
        <p className="mt-1 text-xs text-ink-700">
          Linked providers: <span className="font-mono">{linked}</span>.
          Setting a password keeps magic-link and Google sign-in active too.
        </p>
      </header>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <Input
          type="password"
          autoComplete="new-password"
          required
          placeholder="New password (min 6)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={state === "submitting"}
        />
        <Input
          type="password"
          autoComplete="new-password"
          required
          placeholder="Confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={state === "submitting"}
        />
        <Button type="submit" size="sm" disabled={state === "submitting"}>
          {state === "submitting"
            ? "Saving…"
            : hasPasswordIdentity
              ? "Update password"
              : "Set password"}
        </Button>
        {message ? (
          <p className={state === "error" ? "text-sm text-red-600" : "text-sm text-green-700"}>
            {message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
