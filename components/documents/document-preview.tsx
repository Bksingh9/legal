"use client";

import type { DocumentRender, DocumentBlock } from "@/lib/templates/types";

interface Props {
  doc: unknown;
}

export function DocumentPreview({ doc }: Props) {
  if (!isDocumentRender(doc)) {
    return (
      <p className="text-sm text-neutral-500">No preview available.</p>
    );
  }
  return (
    <article className="mx-auto max-w-2xl rounded-md border border-neutral-200 bg-white p-8 text-sm leading-relaxed shadow-sm">
      <header className="mb-6 text-center">
        <h2 className="text-xl font-semibold uppercase tracking-wide">{doc.title}</h2>
        {doc.subtitle ? (
          <p className="mt-1 text-xs italic text-neutral-500">{doc.subtitle}</p>
        ) : null}
      </header>
      <div className="flex flex-col gap-3">
        {doc.blocks.map((b, i) => renderBlock(b, i))}
      </div>
    </article>
  );
}

function renderBlock(b: DocumentBlock, key: number) {
  switch (b.type) {
    case "heading":
      return (
        <h3
          key={key}
          className={
            b.level === 3
              ? "mt-2 text-sm font-semibold"
              : "mt-3 text-base font-semibold"
          }
        >
          {b.text}
        </h3>
      );
    case "paragraph":
      return (
        <p key={key} className="text-justify">
          {b.text}
        </p>
      );
    case "numbered_list":
      return (
        <ol key={key} className="ml-6 list-decimal space-y-1">
          {b.items.map((it, i) => (
            <li key={i} className="text-justify">
              {it}
            </li>
          ))}
        </ol>
      );
    case "bullet_list":
      return (
        <ul key={key} className="ml-6 list-disc space-y-1">
          {b.items.map((it, i) => (
            <li key={i} className="text-justify">
              {it}
            </li>
          ))}
        </ul>
      );
    case "address_block":
      return (
        <div
          key={key}
          className={b.align === "right" ? "self-end text-right" : ""}
        >
          {b.lines.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
      );
    case "signature_block":
      return (
        <div key={key} className="mt-4">
          {b.lines.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
      );
    case "spacer":
      return (
        <div
          key={key}
          className={b.size === "lg" ? "h-8" : b.size === "md" ? "h-4" : "h-2"}
        />
      );
  }
}

function isDocumentRender(v: unknown): v is DocumentRender {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return typeof r.title === "string" && Array.isArray(r.blocks);
}
