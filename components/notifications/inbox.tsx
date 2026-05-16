"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

type Filter = "all" | "unread";

// Full inbox list. Subscribes to postgres_changes on notifications so
// the list updates live as new events come in or as the bell marks
// rows read.
export function Inbox() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    void load();
    const supa = getSupabaseBrowserClient();
    if (supa) {
      void (async () => {
        const {
          data: { user }
        } = await supa.auth.getUser();
        if (!user) return;
        const channel = supa
          .channel(`inbox:${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${user.id}`
            },
            () => {
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

  async function load() {
    try {
      const res = await fetch("/api/notifications?limit=50", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      /* ignore */
    }
  }

  async function markAllRead() {
    setBusy(true);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ all: true })
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  const visible = filter === "unread" ? items.filter((n) => !n.read_at) : items;
  const unreadCount = items.filter((n) => !n.read_at).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-md border border-ink-200 p-1 text-xs">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded px-3 py-1 ${
              filter === "all" ? "bg-ink-900 text-white" : "text-ink-700"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`rounded px-3 py-1 ${
              filter === "unread" ? "bg-ink-900 text-white" : "text-ink-700"
            }`}
          >
            Unread {unreadCount > 0 ? `(${unreadCount})` : ""}
          </button>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={busy || unreadCount === 0}
          className="text-xs text-ink-700 hover:text-ink-900 disabled:opacity-40"
        >
          Mark all read
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {visible.length === 0 ? (
          <li className="rounded-md border border-ink-100 p-4 text-center text-sm text-ink-400">
            {filter === "unread" ? "No unread notifications." : "Nothing here yet."}
          </li>
        ) : (
          visible.map((n) => (
            <li
              key={n.id}
              className={`rounded-md border border-ink-100 p-3 ${
                n.read_at ? "" : "border-brand-200 bg-brand-50"
              }`}
            >
              <Link href={n.link ?? "/account"} className="block">
                <p className="text-sm font-medium text-ink-900">{n.title}</p>
                {n.body ? (
                  <p className="mt-0.5 text-sm text-ink-700">{n.body}</p>
                ) : null}
                <p className="mt-1 text-[11px] uppercase tracking-wide text-ink-400">
                  {n.kind} · {new Date(n.created_at).toLocaleString()}
                </p>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
