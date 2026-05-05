"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Status = "idle" | "submitting" | "success" | "error";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage(null);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, phone, source: "landing" })
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(body?.error ?? "Something went wrong. Please try again.");
        return;
      }
      setStatus("success");
      setMessage("You're on the list. We'll email you when LegalDesk goes live.");
      setEmail("");
      setPhone("");
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-md border border-brand-100 bg-brand-50 p-4 text-sm text-brand-700">
        {message}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <Input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />
      <Input
        type="tel"
        placeholder="+91 phone (optional, for WhatsApp)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        autoComplete="tel"
        pattern="^\+?[0-9 \-]{7,15}$"
      />
      <Button type="submit" size="lg" disabled={status === "submitting"}>
        {status === "submitting" ? "Joining…" : "Join the waitlist"}
      </Button>
      {status === "error" && message && (
        <p className="text-sm text-red-600">{message}</p>
      )}
    </form>
  );
}
