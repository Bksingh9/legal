"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleButton } from "@/components/auth/google-button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "magic" | "password";

const EmailSchema = z.object({ email: z.string().email() });

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<Mode>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    setMessage(null);

    const supa = getSupabaseBrowserClient();
    if (!supa) {
      setState("error");
      setMessage("Auth is not configured in this environment.");
      return;
    }
    const parsed = EmailSchema.safeParse({ email });
    if (!parsed.success) {
      setState("error");
      setMessage("Enter a valid email.");
      return;
    }

    if (mode === "magic") {
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
      return;
    }

    // password mode
    if (password.length < 6) {
      setState("error");
      setMessage("Password must be at least 6 characters.");
      return;
    }
    const { error } = await supa.auth.signInWithPassword({
      email: parsed.data.email,
      password
    });
    if (error) {
      setState("error");
      setMessage(error.message);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <GoogleButton next={next} />

      <div className="flex items-center gap-2 text-xs text-ink-400">
        <span className="h-px flex-1 bg-ink-100" />
        or
        <span className="h-px flex-1 bg-ink-100" />
      </div>

      <div className="flex gap-1 rounded-md border border-ink-200 p-1 text-xs">
        <button
          type="button"
          onClick={() => {
            setMode("magic");
            setState("idle");
            setMessage(null);
          }}
          className={`flex-1 rounded px-3 py-1 ${
            mode === "magic" ? "bg-ink-900 text-white" : "text-ink-700"
          }`}
        >
          Magic link
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("password");
            setState("idle");
            setMessage(null);
          }}
          className={`flex-1 rounded px-3 py-1 ${
            mode === "password" ? "bg-ink-900 text-white" : "text-ink-700"
          }`}
        >
          Email + password
        </button>
      </div>

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
        {mode === "password" ? (
          <Input
            type="password"
            autoComplete="current-password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={state === "submitting"}
          />
        ) : null}
        <Button type="submit" disabled={state === "submitting" || state === "sent"}>
          {state === "submitting"
            ? mode === "magic"
              ? "Sending link…"
              : "Signing in…"
            : state === "sent"
              ? "Sent"
              : mode === "magic"
                ? "Send sign-in link"
                : "Sign in"}
        </Button>
        {message ? (
          <p className={state === "error" ? "text-sm text-red-600" : "text-sm text-neutral-600"}>
            {message}
          </p>
        ) : null}
      </form>

      <div className="flex justify-between text-xs text-ink-700">
        <Link href={`/auth/signup?next=${encodeURIComponent(next)}`} className="underline hover:text-ink-900">
          Create an account
        </Link>
        <Link href="/auth/forgot-password" className="underline hover:text-ink-900">
          Forgot password?
        </Link>
      </div>
    </div>
  );
}
