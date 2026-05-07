"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface ReferralResponse {
  ok: boolean;
  code: string;
  signups: number;
  paid_referrals: number;
  signup_credit_paise: number;
  paid_credit_paise: number;
  wallet_balance_paise: number;
}

export function ReferralCard() {
  const [data, setData] = useState<ReferralResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/referrals/me")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (!d.ok) {
          setError(d.error ?? "Failed to load.");
          return;
        }
        setData(d as ReferralResponse);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load."));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-neutral-500">Loading...</p>;

  const link = `${typeof window === "undefined" ? "" : window.location.origin}/?ref=${data.code}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border border-neutral-200 p-5">
      <div>
        <p className="text-xs uppercase tracking-wide text-neutral-500">Your referral code</p>
        <p className="mt-1 font-mono text-2xl">{data.code}</p>
      </div>
      <div className="flex items-center gap-3">
        <input
          readOnly
          value={link}
          className="flex-1 rounded-md border border-neutral-300 bg-neutral-50 p-2 text-sm"
        />
        <Button type="button" variant="outline" onClick={copy}>
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
      <dl className="grid grid-cols-3 gap-3 text-sm">
        <Stat label="Signups" value={String(data.signups)} />
        <Stat label="Paid referrals" value={String(data.paid_referrals)} />
        <Stat
          label="Wallet"
          value={`Rs ${(data.wallet_balance_paise / 100).toLocaleString("en-IN")}`}
        />
      </dl>
      <p className="text-xs text-neutral-500">
        We credit Rs {data.signup_credit_paise / 100} when a friend signs up
        with your code, and Rs {data.paid_credit_paise / 100} on their first
        paid transaction. Credits show up in your wallet within minutes.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="text-base font-medium tabular-nums">{value}</dd>
    </div>
  );
}
