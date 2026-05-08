"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CorrectState = "idle" | "saving" | "saved" | "error";
type EraseState = "idle" | "erasing" | "erased" | "error";

export function DpdpControls() {
  const [name, setName] = useState("");
  const [locale, setLocale] = useState("");
  const [correctState, setCorrectState] = useState<CorrectState>("idle");
  const [correctMsg, setCorrectMsg] = useState<string | null>(null);

  const [confirm, setConfirm] = useState("");
  const [eraseState, setEraseState] = useState<EraseState>("idle");
  const [eraseMsg, setEraseMsg] = useState<string | null>(null);

  async function downloadExport() {
    const res = await fetch("/api/dpdp/export", { method: "POST" });
    if (!res.ok) {
      alert(`Export failed (${res.status}).`);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "legaldesk-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function submitCorrection(e: React.FormEvent) {
    e.preventDefault();
    setCorrectState("saving");
    setCorrectMsg(null);
    const patch: Record<string, string> = {};
    if (name.trim()) patch.name = name.trim();
    if (locale.trim()) patch.locale = locale.trim();
    if (Object.keys(patch).length === 0) {
      setCorrectState("error");
      setCorrectMsg("Provide a name or locale to update.");
      return;
    }
    const res = await fetch("/api/dpdp/correct", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch)
    });
    const data = await res.json();
    if (!res.ok) {
      setCorrectState("error");
      setCorrectMsg(data.error ?? "Update failed.");
      return;
    }
    setCorrectState("saved");
    setCorrectMsg("Saved.");
  }

  async function submitErase(e: React.FormEvent) {
    e.preventDefault();
    if (confirm !== "DELETE MY ACCOUNT") {
      setEraseState("error");
      setEraseMsg('Type the phrase exactly: DELETE MY ACCOUNT');
      return;
    }
    setEraseState("erasing");
    setEraseMsg(null);
    const res = await fetch("/api/dpdp/erase", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirm })
    });
    const data = await res.json();
    if (!res.ok) {
      setEraseState("error");
      setEraseMsg(data.error ?? "Erase failed.");
      return;
    }
    setEraseState("erased");
    setEraseMsg("Account erased. You can close this tab.");
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3 rounded-md border border-neutral-200 p-5">
        <h2 className="text-base font-semibold">Export your data</h2>
        <p className="text-sm text-neutral-600">
          Download a JSON file with everything we hold under your account:
          triage queries, documents you generated, payments, consultations,
          subscriptions, wallet ledger, and referral history.
        </p>
        <Button type="button" onClick={downloadExport} className="self-start">
          Download export
        </Button>
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-neutral-200 p-5">
        <h2 className="text-base font-semibold">Correct your profile</h2>
        <p className="text-sm text-neutral-600">
          Update your display name or preferred language. Phone and email are
          tied to sign-in and must be changed from the sign-in screen.
        </p>
        <form onSubmit={submitCorrection} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span>Display name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Locale (en, hi, ta, ...)</span>
            <Input value={locale} onChange={(e) => setLocale(e.target.value)} />
          </label>
          <Button type="submit" disabled={correctState === "saving"} className="self-start">
            {correctState === "saving" ? "Saving..." : "Save changes"}
          </Button>
          {correctMsg ? (
            <p
              className={
                correctState === "error" ? "text-sm text-red-600" : "text-sm text-neutral-600"
              }
            >
              {correctMsg}
            </p>
          ) : null}
        </form>
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-red-200 bg-red-50 p-5">
        <h2 className="text-base font-semibold text-red-900">Delete your account</h2>
        <p className="text-sm text-red-900">
          Permanently erases your profile, triage queries, documents,
          consultations, subscriptions, wallet, referrals, and lawyer
          application (if any). Audit-log entries are preserved without
          identifying content. This is irreversible.
        </p>
        <form onSubmit={submitErase} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span>Type <code>DELETE MY ACCOUNT</code> to confirm:</span>
            <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
          <Button
            type="submit"
            variant="outline"
            disabled={eraseState === "erasing" || eraseState === "erased"}
            className="self-start"
          >
            {eraseState === "erasing" ? "Erasing..." : eraseState === "erased" ? "Erased" : "Erase my account"}
          </Button>
          {eraseMsg ? (
            <p
              className={
                eraseState === "error" ? "text-sm text-red-700" : "text-sm text-red-900"
              }
            >
              {eraseMsg}
            </p>
          ) : null}
        </form>
      </section>
    </div>
  );
}
