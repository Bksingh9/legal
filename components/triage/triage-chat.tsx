"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/triage/disclaimer";
import { VoiceRecorder } from "@/components/triage/voice-recorder";
import type { CasePrep, TriageClassification } from "@/lib/anthropic/types";
import type { GroundedFrameworkEntry } from "@/lib/legal-research/types";

type ClassifyResponse = TriageClassification & {
  ok: boolean;
  persisted: boolean;
  query_id: string | null;
};

type PrepResponse = {
  ok: boolean;
  disclaimer: string;
  prep: CasePrep;
  grounded_framework?: GroundedFrameworkEntry[];
  prep_pdf_url?: string | null;
};

export function TriageChat() {
  const [text, setText] = useState("");
  const [stage, setStage] = useState<
    "idle" | "classifying" | "prepping" | "done" | "error"
  >("idle");
  const [classification, setClassification] = useState<ClassifyResponse | null>(null);
  const [prep, setPrep] = useState<PrepResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 8) {
      setError("Please describe the situation in at least one sentence.");
      return;
    }
    setError(null);
    setClassification(null);
    setPrep(null);
    setStage("classifying");

    try {
      const c = await fetch("/api/triage/classify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ raw_text: text })
      });
      if (!c.ok) throw new Error(await c.text());
      const cdata = (await c.json()) as ClassifyResponse;
      setClassification(cdata);

      setStage("prepping");
      const p = await fetch("/api/triage/prep", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query_id: cdata.query_id ?? undefined,
          raw_text: cdata.query_id ? undefined : text,
          classification: cdata.classification,
          language: cdata.language
        })
      });
      if (!p.ok) throw new Error(await p.text());
      const pdata = (await p.json()) as PrepResponse;
      setPrep(pdata);
      setStage("done");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Triage failed.");
      setStage("error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label htmlFor="query" className="text-sm font-medium">
          Describe your legal situation in plain language. Hindi or English is fine.
        </label>
        <textarea
          id="query"
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={stage === "classifying" || stage === "prepping"}
          placeholder="Example: My landlord has not returned my deposit of Rs 50,000 even three months after I vacated the flat in Mumbai."
          className="w-full rounded-md border border-neutral-300 bg-white p-3 text-sm focus:border-neutral-900 focus:outline-none"
        />
        <div className="flex items-center justify-between gap-3">
          <VoiceRecorder
            disabled={stage === "classifying" || stage === "prepping"}
            onTranscribed={(t) =>
              setText((prev) => (prev ? `${prev.trim()}\n${t}` : t))
            }
          />
          <div className="flex items-center gap-3">
            <p className="text-xs text-neutral-500">
              {text.length}/4000 characters
            </p>
            <Button
              type="submit"
              disabled={stage === "classifying" || stage === "prepping" || text.trim().length < 8}
            >
              {stage === "classifying"
                ? "Classifying..."
                : stage === "prepping"
                  ? "Drafting case prep..."
                  : "Run triage"}
            </Button>
          </div>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>

      {classification ? (
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Initial classification</p>
          <p className="mt-1 text-sm">
            <span className="font-medium">{classification.classification}</span>
            {" · "}
            <span>urgency: {classification.urgency}</span>
            {" · "}
            <span>language: {classification.language}</span>
            {" · "}
            <span>confidence: {(classification.confidence * 100).toFixed(0)}%</span>
          </p>
        </div>
      ) : null}

      {prep ? (
        <article className="flex flex-col gap-4 rounded-md border border-neutral-200 p-5">
          <header className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Case Prep</h2>
            <span className="text-xs text-neutral-500">Urgency: {prep.prep.urgency}</span>
          </header>

          <Disclaimer />

          <section>
            <h3 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Summary</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm">{prep.prep.summary}</p>
          </section>

          {(() => {
            const framework =
              prep.grounded_framework ??
              prep.prep.framework.map((f) => ({ ...f, verified: false }));
            if (framework.length === 0) return null;
            return (
              <section>
                <h3 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
                  Likely framework
                </h3>
                <ul className="mt-1 list-disc pl-5 text-sm">
                  {framework.map((f, i) => (
                    <li key={i}>
                      {f.act}
                      {f.section ? `, Section ${f.section}` : ""}
                      {f.note ? ` — ${f.note}` : ""}
                      {f.verified ? (
                        <>
                          {" "}
                          <span
                            title={f.official_title}
                            className="ml-1 inline-flex items-center rounded bg-green-50 px-1.5 py-0.5 text-[11px] font-medium text-green-700"
                          >
                            ✓ IndiaCode
                          </span>
                          {f.source_url ? (
                            <>
                              {" "}
                              <a
                                href={f.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-600 underline"
                              >
                                source
                              </a>
                            </>
                          ) : null}
                        </>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })()}

          {prep.prep.next_steps.length > 0 ? (
            <section>
              <h3 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
                Next steps
              </h3>
              <ol className="mt-1 list-decimal pl-5 text-sm">
                {prep.prep.next_steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </section>
          ) : null}

          {prep.prep.documents_to_gather.length > 0 ? (
            <section>
              <h3 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
                Documents to gather
              </h3>
              <ul className="mt-1 list-disc pl-5 text-sm">
                {prep.prep.documents_to_gather.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-2">
            {prep.prep_pdf_url ? (
              <a
                href={prep.prep_pdf_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100"
              >
                Download Case Prep PDF
              </a>
            ) : null}
            <a
              href={`/documents/${suggestSku(classification?.classification)}`}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
            >
              Generate the legal document
            </a>
            <a
              href="/consult"
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100"
            >
              Get a 15-min lawyer call
            </a>
          </div>
        </article>
      ) : null}
    </div>
  );
}

function suggestSku(c: string | undefined): string {
  switch (c) {
    case "consumer":
      return "consumer-complaint";
    case "property":
      return "rent-agreement";
    case "criminal":
      return "legal-notice";
    case "civil":
      return "legal-notice";
    case "labour":
      return "legal-notice";
    default:
      return "legal-notice";
  }
}
