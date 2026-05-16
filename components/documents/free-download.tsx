"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Props {
  skuId: string;
  values: Record<string, unknown>;
}

type Format = "pdf" | "docx";

interface ReferralInfo {
  code: string;
  signup_credit_paise: number;
}

export function FreeDownload({ skuId, values }: Props) {
  const [busy, setBusy] = useState<Format | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [referral, setReferral] = useState<ReferralInfo | null>(null);

  // Lazy-load the user's referral code only after a successful download
  // (avoids hitting /api/referrals/me on every page mount).
  useEffect(() => {
    if (!downloaded || referral) return;
    void (async () => {
      try {
        const res = await fetch("/api/referrals/me", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.code) {
          setReferral({
            code: data.code,
            signup_credit_paise: data.signup_credit_paise ?? 100_00
          });
        }
      } catch {
        /* ignore */
      }
    })();
  }, [downloaded, referral]);

  async function download(format: Format) {
    setBusy(format);
    setError(null);
    try {
      const res = await fetch(
        `/api/documents/${encodeURIComponent(skuId)}/download?format=${format}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(values)
        }
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? `Download failed (${res.status}).`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filenameFor(skuId, format);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDownloaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => download("pdf")}
          disabled={busy !== null}
        >
          {busy === "pdf" ? "Preparing PDF…" : "Download as PDF"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => download("docx")}
          disabled={busy !== null}
        >
          {busy === "docx" ? "Preparing DOCX…" : "Download as DOCX"}
        </Button>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {downloaded && referral ? (
        <div className="rounded-md border border-brand-200 bg-brand-50 p-3 text-sm">
          <p className="font-medium text-brand-700">Got your document?</p>
          <p className="mt-1 text-brand-700">
            Send a friend your code{" "}
            <span className="rounded bg-white px-1.5 py-0.5 font-mono text-brand-900">
              {referral.code}
            </span>{" "}
            and earn ₹
            {Math.round(referral.signup_credit_paise / 100)} in wallet
            credit when they sign up.{" "}
            <Link href="/referrals" className="underline">
              See your referrals
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}

function filenameFor(skuId: string, format: Format): string {
  const safe = skuId.replace(/[^a-z0-9-]/gi, "-");
  return `legaldesk-${safe}-${Date.now()}.${format}`;
}
