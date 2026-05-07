"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface OfferRow {
  id: string;
  consultation_id: string;
  sent_at: string;
  expires_at: string;
  pack: string | null;
  language: string | null;
  state: string | null;
  specialization: string | null;
}

export function LawyerOffersList() {
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await fetch("/api/lawyer/offers");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load offers.");
      setOffers((data.offers as OfferRow[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function act(id: string, kind: "accept" | "decline") {
    setBusy(`${id}:${kind}`);
    setError(null);
    try {
      const res = await fetch(`/api/lawyer/offers/${id}/${kind}`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  if (offers.length === 0) {
    return <p className="text-sm text-neutral-500">No pending offers.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">{error}</p>
      ) : null}
      {offers.map((o) => (
        <div key={o.id} className="rounded-md border border-neutral-200 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">
                {o.specialization ?? "—"} · {o.language ?? "—"} · {o.state ?? "—"}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Pack {o.pack ?? "—"} · expires {fmt(o.expires_at)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => act(o.id, "accept")}
                disabled={busy === `${o.id}:accept`}
              >
                {busy === `${o.id}:accept` ? "..." : "Accept"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => act(o.id, "decline")}
                disabled={busy === `${o.id}:decline`}
              >
                Decline
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
