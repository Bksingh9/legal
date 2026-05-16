"use client";

import { useEffect, useRef, useState } from "react";
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

interface SessionUser {
  id: string;
}

// Bell + dropdown in the header. Subscribes to postgres_changes on
// `notifications` for the current user so new rows appear instantly.
export function NotificationsBell() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Resolve the current user once, then start the realtime subscription.
  useEffect(() => {
    const supa = getSupabaseBrowserClient();
    if (!supa) return;
    let unsub: (() => void) | null = null;
    void (async () => {
      const {
        data: { user: u }
      } = await supa.auth.getUser();
      if (!u) return;
      setUser({ id: u.id });
      await refresh();
      const channel = supa
        .channel(`notifications:${u.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${u.id}`
          },
          (payload) => {
            const row = payload.new as NotificationItem;
            setItems((prev) => [row, ...prev].slice(0, 30));
          }
        )
        .subscribe();
      unsub = () => {
        void supa.removeChannel(channel);
      };
    })();
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function refresh() {
    try {
      const res = await fetch("/api/notifications?limit=20", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      /* ignore */
    }
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ all: true })
    });
    setItems((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
  }

  if (!user) return null;
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`Notifications (${unread} unread)`}
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-ink-200 bg-white text-ink-900 hover:bg-ink-50"
      >
        <BellIcon />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-md border border-ink-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-ink-100 px-3 py-2 text-xs text-ink-400">
            <span>Notifications</span>
            <button
              type="button"
              onClick={markAllRead}
              className="hover:text-ink-700"
              disabled={unread === 0}
            >
              Mark all read
            </button>
          </div>
          <ul className="max-h-96 overflow-auto">
            {items.length === 0 ? (
              <li className="px-3 py-6 text-center text-xs text-ink-400">
                No notifications yet.
              </li>
            ) : (
              items.map((n) => (
                <li
                  key={n.id}
                  className={`border-b border-ink-100 last:border-b-0 ${
                    n.read_at ? "" : "bg-brand-50"
                  }`}
                >
                  <Link
                    href={n.link ?? "/account"}
                    className="block px-3 py-2 hover:bg-ink-50"
                    onClick={() => setOpen(false)}
                  >
                    <p className="text-sm font-medium text-ink-900">{n.title}</p>
                    {n.body ? (
                      <p className="mt-0.5 text-xs text-ink-700 line-clamp-2">{n.body}</p>
                    ) : null}
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-ink-400">
                      {timeAgo(n.created_at)}
                    </p>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const sec = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}
