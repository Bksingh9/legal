// LegalDesk AI service worker.
//
// Responsibilities:
//   1. Receive Web Push payloads from /lib/notify/web-push.ts
//      (payload shape: { title, body, link }) and surface them as
//      OS-level notifications.
//   2. Open or focus the relevant page on notification click.
//
// No fetch handler / no offline caching here — kept intentionally
// minimal so it stays auditable. Add precaching later only if there's
// a real reason to.

self.addEventListener("install", (event) => {
  // Take over from any older SW immediately on the next reload.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = { title: "LegalDesk", body: "", link: "/" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (e) {
    // If the push payload isn't JSON, fall back to raw text.
    try {
      if (event.data) payload.body = event.data.text();
    } catch {
      /* ignore */
    }
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || "LegalDesk", {
      body: payload.body || "",
      icon: "/icon",
      badge: "/icon",
      data: { link: payload.link || "/" }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true
      });
      const origin = self.location.origin;
      for (const client of all) {
        if (client.url.startsWith(origin)) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(origin + link);
            } catch {
              /* some browsers reject navigate; ignore */
            }
          }
          return;
        }
      }
      await self.clients.openWindow(origin + link);
    })()
  );
});
