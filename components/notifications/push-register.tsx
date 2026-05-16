"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type State = "idle" | "unsupported" | "asking" | "subscribed" | "denied" | "error";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

// One-click "enable browser notifications" surface. Lives on /account.
// Registers the service worker, asks for permission, subscribes via
// PushManager, POSTs the subscription to /api/push/subscribe. All
// browser-native — no third-party SDK.
export function PushRegister() {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof Notification === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !PUBLIC_KEY
    ) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") setState("denied");
    if (Notification.permission === "granted") setState("subscribed");
  }, []);

  async function enable() {
    setState("asking");
    setError(null);
    try {
      const supa = getSupabaseBrowserClient();
      if (!supa) throw new Error("Sign in first.");

      // Register the SW (idempotent if already installed).
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "idle");
        return;
      }

      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          // Cast: lib.dom types accept BufferSource, but the bundled
          // Uint8Array type is parameterised over ArrayBufferLike which
          // doesn't structurally match. The runtime value is fine.
          applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY) as unknown as BufferSource
        }));

      const json = sub.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Push subscription is missing required keys.");
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth }
        })
      });
      if (!res.ok) throw new Error("Could not save subscription.");
      setState("subscribed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to enable push.");
      setState("error");
    }
  }

  if (state === "unsupported") {
    return (
      <p className="text-xs text-neutral-500">
        Browser push not supported on this device.
      </p>
    );
  }
  if (state === "subscribed") {
    return (
      <p className="text-sm text-green-700">
        Browser notifications are on. You&apos;ll get pings even when this
        tab is closed.
      </p>
    );
  }
  if (state === "denied") {
    return (
      <p className="text-sm text-amber-800">
        You blocked notifications for this site. Enable them in your browser
        settings to receive offer alerts when the tab is closed.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <Button type="button" onClick={enable} disabled={state === "asking"}>
        {state === "asking" ? "Asking permission…" : "Turn on browser notifications"}
      </Button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
