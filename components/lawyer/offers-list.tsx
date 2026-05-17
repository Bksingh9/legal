"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

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
    let unsub: (() => void) | null = null;
    load();
    const supa = getSupabaseBrowserClient();
    if (supa) {
      void (async () => {
        const {
          data: { user }
        } = await supa.auth.getUser();
        if (!user) return;
        // Resolve the lawyer row id for this user so we can filter the
        // realtime feed server-side.
        const { data: lw } = await supa
          .from("lawyers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!lw?.id) return;
        const channel = supa
          .channel(`offers:${lw.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "consultation_offers",
              filter: `lawyer_id=eq.${lw.id}`
            },
            () => {
              // Cheap: refetch from the REST endpoint to pick up the
              // joined fields (specialization, language, state) without
              // duplicating the query here.
              void load();
            }
          )
          .subscribe();
        unsub = () => {
          void supa.removeChannel(channel);
        };
      })();
    }
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const [accepted, setAccepted] = useState<{
    consultationId: string;
    waLink: string | null;
  } | null>(null);

  async function act(id: string, kind: "accept" | "decline") {
    setBusy(`${id}:${kind}`);
    setError(null);
    try {
      const res = await fetch(`/api/lawyer/offers/${id}/${kind}`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed.");
      if (kind === "accept" && data.consultation_id) {
        setAccepted({
          consultationId: data.consultation_id,
          waLink: data.client_whatsapp_link ?? null
        });
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  if (accepted) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-md border border-green-300 bg-green-50 p-4 text-sm">
          <p className="text-base font-semibold text-green-900">
            Offer accepted. Other lawyers&apos; pending offers on this
            consultation are now expired.
          </p>
          <p className="mt-2 text-green-800">
            Reference:{" "}
            <span className="font-mono">{accepted.consultationId.slice(0, 8)}</span>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {accepted.waLink ? (
              <a
                href={accepted.waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-md bg-green-600 px-4 text-sm font-medium text-white hover:bg-green-700"
              >
                Message client on WhatsApp
              </a>
            ) : null}
            <a
              href={`/consultations/${accepted.consultationId}`}
              className="inline-flex h-10 items-center justify-center rounded-md border border-ink-200 bg-white px-4 text-sm font-medium text-ink-900 hover:bg-ink-50"
            >
              Open waiting room
            </a>
            <button
              type="button"
              onClick={() => setAccepted(null)}
              className="inline-flex h-10 items-center justify-center rounded-md px-4 text-sm text-ink-700 hover:bg-ink-50"
            >
              Back to offers
            </button>
          </div>
        </div>
      </div>
    );
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
