"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  documentId: string;
  addon: boolean;
  priceLabel: string;
}

interface OrderResponse {
  ok: boolean;
  order_id: string;
  amount_paise: number;
  currency: "INR";
  razorpay_key_id: string | null;
}

interface RazorpayCheckoutOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  notes?: Record<string, string>;
  handler?: (resp: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (opts: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

export function CheckoutButton({ documentId, addon, priceLabel }: Props) {
  const [state, setState] = useState<"idle" | "creating" | "checkout" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function payNow() {
    setState("creating");
    setMessage(null);
    try {
      const res = await fetch("/api/payments/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          document_id: documentId,
          idempotency_key: `${documentId}:${addon ? 1 : 0}`
        })
      });
      const data: OrderResponse | { error?: string } = await res.json();
      if (!res.ok || !("order_id" in data)) {
        const e = (data as { error?: string }).error ?? "Could not start checkout.";
        setState("error");
        setMessage(e);
        return;
      }

      if (!data.razorpay_key_id) {
        setState("done");
        setMessage(
          "Mock mode (Razorpay not configured). Order created: " + data.order_id
        );
        return;
      }

      await ensureCheckoutScript();
      const Razorpay = window.Razorpay;
      if (!Razorpay) throw new Error("Razorpay SDK failed to load.");

      const rp = new Razorpay({
        key: data.razorpay_key_id,
        order_id: data.order_id,
        amount: data.amount_paise,
        currency: data.currency,
        name: "LegalDesk AI",
        description: addon ? "Document + lawyer review" : "Document",
        handler: () => {
          setState("done");
          setMessage("Payment received. Your document is being prepared and will be emailed shortly.");
        },
        modal: { ondismiss: () => setState("idle") }
      });
      setState("checkout");
      rp.open();
    } catch (e) {
      setState("error");
      setMessage(e instanceof Error ? e.message : "Checkout failed.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" onClick={payNow} disabled={state === "creating" || state === "checkout"}>
        {state === "creating" ? "Starting checkout..." : state === "done" ? "Done" : `Pay ${priceLabel}`}
      </Button>
      {message ? (
        <p className={state === "error" ? "text-sm text-red-600" : "text-sm text-neutral-600"}>
          {message}
        </p>
      ) : null}
    </div>
  );
}

async function ensureCheckoutScript(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Razorpay checkout."));
    document.head.appendChild(s);
  });
}
