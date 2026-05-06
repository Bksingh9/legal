"use client";

import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const Schema = z.object({ email: z.string().email() });

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Schema.safeParse({ email });
    if (!parsed.success) {
      setState("error");
      setMessage("Enter a valid email.");
      return;
    }

    const supa = getSupabaseBrowserClient();
    if (!supa) {
      setState("error");
      setMessage("Auth is not configured in this environment.");
      return;
    }

    setState("sending");
    setMessage(null);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supa.auth.signInWithOtp({
      email: parsed.data.email,
      options: { emailRedirectTo: redirectTo }
    });

    if (error) {
      setState("error");
      setMessage(error.message);
      return;
    }
    setState("sent");
    setMessage("Check your email for the sign-in link.");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <Input
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={state === "sending" || state === "sent"}
      />
      <Button type="submit" disabled={state === "sending" || state === "sent"}>
        {state === "sending" ? "Sending link..." : state === "sent" ? "Sent" : "Send sign-in link"}
      </Button>
      {message ? (
        <p
          className={
            state === "error"
              ? "text-sm text-red-600"
              : "text-sm text-neutral-600"
          }
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
