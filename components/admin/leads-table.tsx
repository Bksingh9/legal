"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface LeadRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  issue: string;
  inferred_specialization: string | null;
  status: "new" | "called" | "converted" | "dropped";
  created_at: string;
}

type Filter = "new" | "called" | "converted" | "dropped";

export function AdminLeadsTable() {
  const [items, setItems] = useState<LeadRow[]>([]);
  const [filter, setFilter] = useState<Filter>("new");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
    let unsub: (() => void) | null = null;
    const supa = getSupabaseBrowserClient();
    if (supa) {
      const channel = supa
        .channel("admin-leads")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "consultation_leads"
          },
          () => void load()
        )
        .subscribe();
      unsub = () => {
        void supa.removeChannel(channel);
      };
    }
    return () => {
      if (unsub) unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function load() {
    setError(null);
    try {
      const res = await fetch(`/api/admin/leads?status=${filter}`, {
        cache: "no-store"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load.");
      setItems((data.items as LeadRow[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    }
  }

  async function act(id: string, action: "mark_called" | "drop") {
    setBusy(`${id}:${action}`);
    try {
      await fetch(`/api/admin/leads/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action })
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-md border border-ink-200 p-1 text-xs">
        {(["new", "called", "converted", "dropped"] as Filter[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded px-3 py-1 capitalize ${
              filter === s ? "bg-ink-900 text-white" : "text-ink-700"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-md border border-ink-100 p-6 text-center text-sm text-ink-400">
          No {filter} leads.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((l) => (
            <li
              key={l.id}
              className="rounded-md border border-ink-100 p-4 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-medium text-ink-900">
                    {l.name}{" "}
                    <span className="text-ink-400">
                      · {l.phone}
                      {l.city ? ` · ${l.city}` : ""}
                      {l.inferred_specialization
                        ? ` · ${l.inferred_specialization}`
                        : ""}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-ink-700">{l.issue}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-ink-400">
                    {new Date(l.created_at).toLocaleString()}
                  </p>
                </div>
                {l.status === "new" ? (
                  <div className="flex gap-2">
                    <a
                      href={`tel:${l.phone.replace(/[^+\d]/g, "")}`}
                      className="inline-flex h-9 items-center justify-center rounded-md bg-brand-600 px-3 text-xs font-medium text-white hover:bg-brand-700"
                    >
                      Call
                    </a>
                    <a
                      href={`https://wa.me/${l.phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
                        `Hi ${l.name}, this is LegalDesk. We received your request. Are you free for a quick call?`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center justify-center rounded-md border border-ink-200 bg-white px-3 text-xs font-medium text-ink-900 hover:bg-ink-50"
                    >
                      WhatsApp
                    </a>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => act(l.id, "mark_called")}
                      disabled={busy === `${l.id}:mark_called`}
                    >
                      Mark called
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => act(l.id, "drop")}
                      disabled={busy === `${l.id}:drop`}
                    >
                      Drop
                    </Button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
