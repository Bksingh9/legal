"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

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
    setMessage("Password updated. Redirecting…");
    setTimeout(() => {
      router.replace("/account");
      router.refresh();
    }, 800);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Input
        type="password"
        autoComplete="new-password"
        required
        placeholder="New password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={state === "submitting" || state === "done"}
      />
      <Input
        type="password"
        autoComplete="new-password"
        required
        placeholder="Confirm new password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        disabled={state === "submitting" || state === "done"}
      />
      <Button type="submit" disabled={state === "submitting" || state === "done"}>
        {state === "submitting" ? "Updating…" : state === "done" ? "Updated" : "Set new password"}
      </Button>
      {message ? (
        <p className={state === "error" ? "text-sm text-red-600" : "text-sm text-neutral-700"}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
