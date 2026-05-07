"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface StartResponse {
  ok: boolean;
  subscription_id: string;
  status: string;
  checkout_url: string | null;
}

export function StartPlusButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StartResponse | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/subscriptions/start", { method: "POST" });
      const data = (await res.json()) as StartResponse | { error?: string };
      if (!res.ok || !("subscription_id" in data)) {
        setError((data as { error?: string }).error ?? "Could not start subscription.");
        return;
      }
      setResult(data);
      if (data.checkout_url) window.location.href = data.checkout_url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" onClick={start} disabled={busy}>
        {busy ? "Starting..." : "Start LegalDesk Plus"}
      </Button>
      {result && !result.checkout_url ? (
        <p className="text-sm text-neutral-600">
          Subscription created (mock mode): {result.subscription_id}
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
