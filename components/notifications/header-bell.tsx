"use client";

import dynamic from "next/dynamic";

// Floating bell anchored to the top-right of every page. Rendered as a
// client component because it talks to Supabase Realtime; the dynamic
// import keeps it out of the SSR bundle of every page that doesn't
// need it.
const NotificationsBell = dynamic(
  () => import("./bell").then((m) => m.NotificationsBell),
  { ssr: false }
);

export function HeaderBell() {
  return (
    <div className="fixed right-4 top-4 z-40">
      <NotificationsBell />
    </div>
  );
}
