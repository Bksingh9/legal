"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  documentId?: string;
  consultationId?: string;
  idempotencyKey: string;
  amountLabel: string;
}

type Stage =
  | { kind: "idle" }
  | { kind: "intent-loading" }
  | { kind: "intent"; paymentId: string; upiUrl: string; txRef: string; vpa: string; merchantName: string; amountPaise: number }
  | { kind: "submitting" }
  | { kind: "submitted" }
  | { kind: "error"; message: string };

// Zero-key payment: opens a UPI deep link on mobile, shows a QR code
// on desktop, then asks the user for the 12-digit UTR they receive
// from their UPI app. Admin reconciles weekly.
export function UpiCheckout(props: Props) {
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [utr, setUtr] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  async function start() {
    setStage({ kind: "intent-loading" });
    try {
      const res = await fetch("/api/payments/upi-intent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          document_id: props.documentId,
          consultation_id: props.consultationId,
          idempotency_key: props.idempotencyKey
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start UPI.");
      setStage({
        kind: "intent",
        paymentId: data.payment_id,
        upiUrl: data.upi_url,
        txRef: data.tx_ref,
        vpa: data.vpa,
        merchantName: data.merchant_name,
        amountPaise: data.amount_paise
      });
    } catch (e) {
      setStage({
        kind: "error",
        message: e instanceof Error ? e.message : "Could not start UPI."
      });
    }
  }

  // Render QR whenever we enter the intent stage.
  useEffect(() => {
    if (stage.kind !== "intent" || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, stage.upiUrl, { width: 220, margin: 1 }).catch(
      (e) => console.error("qr render failed", e)
    );
  }, [stage]);

  async function submitUtr() {
    if (stage.kind !== "intent") return;
    if (utr.trim().length < 12) {
      setStage({ ...stage });
      return;
    }
    setStage({ kind: "submitting" });
    try {
      const res = await fetch("/api/payments/upi-confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ payment_id: stage.paymentId, utr: utr.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit UTR.");
      setStage({ kind: "submitted" });
    } catch (e) {
      setStage({
        kind: "error",
        message: e instanceof Error ? e.message : "Could not submit UTR."
      });
    }
  }

  if (stage.kind === "idle" || stage.kind === "intent-loading") {
    return (
      <div className="flex flex-col gap-2">
        <Button type="button" onClick={start} disabled={stage.kind === "intent-loading"}>
          {stage.kind === "intent-loading" ? "Preparing…" : `Pay ${props.amountLabel} via UPI`}
        </Button>
        <p className="text-xs text-neutral-500">
          You&apos;ll get a deep link or QR. Pay with any UPI app (GPay,
          PhonePe, Paytm, BHIM). Submit the UTR back here when done.
        </p>
      </div>
    );
  }

  if (stage.kind === "intent") {
    return (
      <div className="flex flex-col gap-4 rounded-md border border-ink-100 bg-ink-50 p-4">
        <div>
          <p className="text-sm font-medium">
            Pay ₹{(stage.amountPaise / 100).toFixed(0)} to{" "}
            <span className="font-mono">{stage.vpa}</span>
          </p>
          <p className="mt-1 text-xs text-ink-700">
            {stage.merchantName} · Reference{" "}
            <span className="font-mono">{stage.txRef}</span> (quote this if
            asked)
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          <canvas ref={canvasRef} className="rounded-md bg-white p-2" />
          <div className="flex flex-col gap-2 text-sm">
            <a
              href={stage.upiUrl}
              className="inline-flex h-10 items-center justify-center rounded-md bg-brand-600 px-4 text-white hover:bg-brand-700"
            >
              Open in UPI app
            </a>
            <p className="text-xs text-ink-700">
              On mobile: tap the button.
              <br />
              On desktop: scan the QR with your phone.
            </p>
          </div>
        </div>

        <div className="border-t border-ink-100 pt-3">
          <label className="flex flex-col gap-1 text-sm">
            <span>After paying, paste the 12-digit UTR:</span>
            <Input
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              placeholder="e.g. 412319876543"
              inputMode="numeric"
              maxLength={22}
            />
          </label>
          <Button type="button" onClick={submitUtr} className="mt-2" disabled={utr.trim().length < 12}>
            Submit UTR
          </Button>
          <p className="mt-2 text-xs text-ink-400">
            We verify against the bank statement within 24 hours. You&apos;ll
            get a notification when it&apos;s confirmed.
          </p>
        </div>
      </div>
    );
  }

  if (stage.kind === "submitting") {
    return <p className="text-sm">Submitting UTR…</p>;
  }
  if (stage.kind === "submitted") {
    return (
      <div className="rounded-md border border-green-300 bg-green-50 p-4 text-sm text-green-800">
        UTR received. We&apos;ll verify against the bank statement within
        24 hours and notify you. You can already download the document
        above; lawyer-review unlocks once payment is verified.
      </div>
    );
  }
  return (
    <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
      {stage.message}
      <button
        type="button"
        onClick={() => setStage({ kind: "idle" })}
        className="ml-2 underline"
      >
        Try again
      </button>
    </div>
  );
}
