"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  skuId: string;
  values: Record<string, unknown>;
}

type Format = "pdf" | "docx";

export function FreeDownload({ skuId, values }: Props) {
  const [busy, setBusy] = useState<Format | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
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
    </div>
  );
}

function filenameFor(skuId: string, format: Format): string {
  const safe = skuId.replace(/[^a-z0-9-]/gi, "-");
  return `legaldesk-${safe}-${Date.now()}.${format}`;
}
