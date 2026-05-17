"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const Schema = z
  .object({
    email: z.string().email(),
    password: z.string().min(6, "At least 6 characters."),
    confirm: z.string()
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"]
  });

export function SignupForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "sent" | "signed-in" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    setMessage(null);

    const parsed = Schema.safeParse({ email, password, confirm });
    if (!parsed.success) {
      setState("error");
      setMessage(parsed.error.issues[0].message);
      return;
    }
    const supa = getSupabaseBrowserClient();
    if (!supa) {
      setState("error");
      setMessage("Auth is not configured in this environment.");
      return;
    }

    const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { data, error } = await supa.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { emailRedirectTo }
    });
    if (error) {
      setState("error");
      setMessage(error.message);
      return;
    }
    // Supabase may return a session immediately (if auto-confirm is on)
    // or require email confirmation (default). Handle both.
    if (data.session) {
      setState("signed-in");
      router.replace(next);
      router.refresh();
      return;
    }
    setState("sent");
    setMessage("Check your inbox for a confirmation link.");
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
        disabled={state !== "idle" && state !== "error"}
      />
      <Input
        type="password"
        autoComplete="new-password"
        required
        placeholder="Password (min 6 characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={state !== "idle" && state !== "error"}
      />
      <Input
        type="password"
        autoComplete="new-password"
        required
        placeholder="Confirm password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        disabled={state !== "idle" && state !== "error"}
      />
      <Button type="submit" disabled={state === "submitting" || state === "sent"}>
        {state === "submitting" ? "Creating account…" : state === "sent" ? "Check your inbox" : "Create account"}
      </Button>
      {message ? (
        <p className={state === "error" ? "text-sm text-red-600" : "text-sm text-neutral-700"}>
          {message}
        </p>
      ) : null}
      <p className="text-xs text-ink-400">
        Already have an account?{" "}
        <Link href={`/auth/login?next=${encodeURIComponent(next)}`} className="underline hover:text-ink-700">
          Sign in
        </Link>
      </p>
    </form>
  );
}
