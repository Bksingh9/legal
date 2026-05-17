"use client";

import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const Schema = z.object({ email: z.string().email() });

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    setMessage(null);

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
    const redirectTo = `${window.location.origin}/auth/reset-password`;
    const { error } = await supa.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo
    });
    if (error) {
      setState("error");
      setMessage(error.message);
      return;
    }
    setState("sent");
    setMessage(
      "If an account exists for that email, a reset link is on its way (within the free-tier 3/hour mailer cap)."
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Input
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={state === "submitting" || state === "sent"}
      />
      <Button type="submit" disabled={state === "submitting" || state === "sent"}>
        {state === "submitting" ? "Sending…" : state === "sent" ? "Sent" : "Send reset link"}
      </Button>
      {message ? (
        <p className={state === "error" ? "text-sm text-red-600" : "text-sm text-neutral-700"}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
