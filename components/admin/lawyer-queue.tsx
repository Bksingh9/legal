"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface AdminLawyerRow {
  id: string;
  anon_slug: string;
  bar_council_id: string;
  state: string;
  specializations: string[];
  languages: string[];
  years_exp: number;
  rating: number;
  status: "pending" | "verified" | "suspended";
  route_account_id: string | null;
  digilocker_uri: string | null;
  created_at: string;
  verified_at: string | null;
  suspended_at: string | null;
  suspension_reason: string | null;
}

const TABS: AdminLawyerRow["status"][] = ["pending", "verified", "suspended"];

export function LawyerQueue() {
  const [tab, setTab] = useState<AdminLawyerRow["status"]>("pending");
  const [rows, setRows] = useState<AdminLawyerRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await fetch(`/api/admin/lawyers?status=${tab}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load.");
      setRows(data.lawyers as AdminLawyerRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function act(id: string, action: "verify" | "suspend") {
    setBusy(id + ":" + action);
    setError(null);
    try {
      const body = action === "suspend" ? promptForReason() : {};
      if (action === "suspend" && !body) {
        setBusy(null);
        return;
      }
      const res = await fetch(`/api/admin/lawyers/${id}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "rounded-md px-3 py-1 text-sm " +
              (tab === t
                ? "bg-neutral-900 text-white"
                : "border border-neutral-300 text-neutral-700 hover:bg-neutral-100")
            }
          >
            {t}
          </button>
        ))}
        <button onClick={load} className="ml-auto text-sm text-neutral-600 hover:underline">
          Refresh
        </button>
      </div>

      {error ? (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">{error}</p>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">No lawyers in this state.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-md border border-neutral-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">
                    BCI {r.bar_council_id} · {r.state} · {r.years_exp}y
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">ref {r.anon_slug}</p>
                  <p className="mt-2 text-sm">
                    Specializations: {r.specializations.join(", ")}
                  </p>
                  <p className="text-sm">Languages: {r.languages.join(", ")}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Route account: {r.route_account_id ?? "pending"}
                  </p>
                  {r.suspension_reason ? (
                    <p className="mt-2 text-xs text-red-700">
                      Suspended: {r.suspension_reason}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2">
                  {r.status !== "verified" ? (
                    <Button
                      type="button"
                      onClick={() => act(r.id, "verify")}
                      disabled={busy === `${r.id}:verify`}
                    >
                      {busy === `${r.id}:verify` ? "Verifying..." : "Verify"}
                    </Button>
                  ) : null}
                  {r.status !== "suspended" ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => act(r.id, "suspend")}
                      disabled={busy === `${r.id}:suspend`}
                    >
                      Suspend
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function promptForReason(): { reason: string } | null {
  if (typeof window === "undefined") return null;
  const r = window.prompt("Reason for suspension (8+ characters):", "");
  if (!r || r.trim().length < 8) return null;
  return { reason: r.trim() };
}
