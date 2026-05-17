"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConsentCheckbox } from "@/components/legal/consent-checkbox";

type Stage = "idle" | "submitting" | "submitted" | "error";

export function LeadCapture() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [issue, setIssue] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) {
      setError("Please accept the Terms and Privacy Policy to continue.");
      return;
    }
    if (name.trim().length < 2) {
      setError("Please enter your name.");
      return;
    }
    if (!/^\+?[0-9 \-]{7,15}$/.test(phone.trim())) {
      setError("Please enter a valid phone number with country code.");
      return;
    }
    if (issue.trim().length < 20) {
      setError("Please describe your situation in at least one sentence.");
      return;
    }
    setStage("submitting");
    setError(null);
    try {
      const res = await fetch("/api/consult-leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          issue: issue.trim(),
          city: city.trim() || undefined,
          email: email.trim() || undefined,
          marketing_opt_in: marketingOptIn
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setStage("error");
        setError(data.error ?? "Could not submit. Please try again.");
        return;
      }
      setStage("submitted");
      setLeadId(data.lead_id);
    } catch (err) {
      setStage("error");
      setError(err instanceof Error ? err.message : "Network error.");
    }
  }

  if (stage === "submitted") {
    return (
      <div className="rounded-md border border-green-300 bg-green-50 p-6 text-sm">
        <p className="text-base font-semibold text-green-900">
          We&apos;ve got your details. Expect a call in the next 10 minutes.
        </p>
        <p className="mt-2 text-green-800">
          Reference: <span className="font-mono">{leadId?.slice(0, 8)}</span>.
          If we miss you, we&apos;ll try again within an hour and follow up
          on your phone via WhatsApp.
        </p>
        <p className="mt-4 text-xs text-green-700">
          While you wait, you can{" "}
          <a href="/triage" className="underline">
            run free AI triage
          </a>{" "}
          on your situation — you&apos;ll have a one-page Case Prep ready
          for the call.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Your name *</span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          autoComplete="name"
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Phone (with country code) *</span>
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91 98xxxxxxxx"
          autoComplete="tel"
          inputMode="tel"
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">
          Describe your legal situation in one line *
        </span>
        <textarea
          rows={3}
          value={issue}
          onChange={(e) => setIssue(e.target.value)}
          placeholder="e.g. My landlord refuses to refund my Rs 50000 deposit after 3 months."
          className="rounded-md border border-ink-200 bg-white p-2 text-sm focus:border-brand-500 focus:outline-none"
          minLength={20}
          maxLength={400}
          required
        />
        <span className="text-xs text-ink-400">
          {issue.trim().length} / 400 characters
        </span>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span>City (optional)</span>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Mumbai"
            autoComplete="address-level2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Email (optional — for case prep)</span>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>
      </div>

      <ConsentCheckbox
        checked={consent}
        onChange={setConsent}
        marketingOptIn={marketingOptIn}
        onMarketingChange={setMarketingOptIn}
        disabled={stage === "submitting"}
      />

      <Button type="submit" size="lg" disabled={stage === "submitting" || !consent}>
        {stage === "submitting" ? "Submitting…" : "Call me back in 10 minutes"}
      </Button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
