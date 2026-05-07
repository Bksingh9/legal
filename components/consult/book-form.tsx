"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Disclaimer } from "@/components/triage/disclaimer";
import { CheckoutButton } from "@/components/documents/checkout-button";
import { CONSULT_PACKS, listPacks, type PackId } from "@/lib/consult/packs";
import { SPECIALIZATIONS, LAWYER_LANGUAGES } from "@/lib/lawyers/types";

type Stage =
  | { kind: "edit" }
  | { kind: "booking" }
  | { kind: "ready"; consultationId: string; matched: number; pricePaise: number }
  | { kind: "error"; message: string };

const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
  "Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand",
  "Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
  "Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan",
  "Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal"
];

export function BookConsultForm() {
  const [pack, setPack] = useState<PackId>("p15");
  const [channel, setChannel] = useState<"call" | "video">("call");
  const [spec, setSpec] = useState<string>("civil");
  const [lang, setLang] = useState<string>("en");
  const [state, setState] = useState<string>("");
  const [stage, setStage] = useState<Stage>({ kind: "edit" });

  const packMeta = CONSULT_PACKS[pack];

  async function book(e: React.FormEvent) {
    e.preventDefault();
    if (!state) {
      setStage({ kind: "error", message: "Pick a state." });
      return;
    }
    setStage({ kind: "booking" });
    try {
      const res = await fetch("/api/consultations/book", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pack,
          channel,
          specialization: spec,
          language: lang,
          state
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setStage({ kind: "error", message: data.error ?? "Booking failed." });
        return;
      }
      setStage({
        kind: "ready",
        consultationId: data.consultation_id,
        matched: data.matched ?? 0,
        pricePaise: packMeta.price_paise
      });
    } catch (err) {
      setStage({
        kind: "error",
        message: err instanceof Error ? err.message : "Booking failed."
      });
    }
  }

  if (stage.kind === "ready") {
    return (
      <div className="flex flex-col gap-4 rounded-md border border-neutral-200 p-4">
        <p className="text-sm">
          Booking saved. We have notified up to {stage.matched} verified
          {" advocate"}{stage.matched === 1 ? "" : "s"} matching your filters.
          The first one to accept will be assigned to you within four hours.
          Pay below to hold the slot; refunded automatically if no advocate
          accepts.
        </p>
        <CheckoutButton
          documentId={stage.consultationId}
          addon={false}
          priceLabel={(stage.pricePaise / 100).toLocaleString("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
          })}
        />
        <Disclaimer />
      </div>
    );
  }

  return (
    <form onSubmit={book} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
          Pack
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {listPacks().map((p) => {
            const selected = pack === p.id;
            return (
              <label
                key={p.id}
                className={
                  "flex cursor-pointer flex-col gap-1 rounded-md border p-3 text-sm " +
                  (selected
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 hover:border-neutral-700")
                }
              >
                <input
                  type="radio"
                  name="pack"
                  value={p.id}
                  checked={selected}
                  onChange={() => setPack(p.id)}
                  className="sr-only"
                />
                <span className="font-medium">{p.title}</span>
                <span className="text-xs opacity-80">{p.description}</span>
                <span className="mt-1 font-medium tabular-nums">
                  {(p.price_paise / 100).toLocaleString("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0
                  })}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
          Channel
        </legend>
        <div className="flex gap-3">
          {(["call", "video"] as const).map((c) => (
            <label key={c} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="channel"
                value={c}
                checked={channel === c}
                onChange={() => setChannel(c)}
              />
              <span className="capitalize">{c}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-neutral-500">
          Calls use a masked number (Exotel). Video uses a 100ms room link.
        </p>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span>Issue area *</span>
          <select
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
            className="rounded-md border border-neutral-300 bg-white p-2 text-sm focus:border-neutral-900 focus:outline-none"
          >
            {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Language *</span>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="rounded-md border border-neutral-300 bg-white p-2 text-sm focus:border-neutral-900 focus:outline-none"
          >
            {LAWYER_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>State *</span>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="rounded-md border border-neutral-300 bg-white p-2 text-sm focus:border-neutral-900 focus:outline-none"
          >
            <option value="" disabled>Select</option>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>

      <Button type="submit" disabled={stage.kind === "booking"}>
        {stage.kind === "booking" ? "Finding advocates..." : `Find an advocate · ${(packMeta.price_paise / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}`}
      </Button>
      {stage.kind === "error" ? (
        <p className="text-sm text-red-600">{stage.message}</p>
      ) : null}
    </form>
  );
}
