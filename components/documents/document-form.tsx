"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Disclaimer } from "@/components/triage/disclaimer";
import { DocumentPreview } from "@/components/documents/document-preview";
import { CheckoutButton } from "@/components/documents/checkout-button";
import { FreeDownload } from "@/components/documents/free-download";
import { UpiCheckout } from "@/components/payments/upi-checkout";
import { WhatsAppShare } from "@/components/share/whatsapp-share";
import { setDeep, getDeep } from "@/lib/forms/types";
import type { FormSpec, FieldSpec } from "@/lib/forms/types";

interface SkuSummary {
  id: string;
  title: string;
  short_description: string;
  price_paise: number;
  allow_addon_lawyer_review: boolean;
}

type Stage =
  | { kind: "edit" }
  | { kind: "previewing" }
  | { kind: "preview"; doc: unknown }
  | { kind: "saving" }
  | { kind: "ready"; documentId: string; addon: boolean }
  | { kind: "error"; message: string };

interface Props {
  sku: SkuSummary;
  spec: FormSpec;
  razorpayConfigured?: boolean;
  upiConfigured?: boolean;
  siteUrl?: string;
}

export function DocumentForm({
  sku,
  spec,
  razorpayConfigured = false,
  upiConfigured = false,
  siteUrl
}: Props) {
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    seedDefaults(spec)
  );
  const [addon, setAddon] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: "edit" });

  function update(path: string, value: unknown) {
    setValues((prev) => {
      const next = { ...prev };
      setDeep(next, path, value);
      return next;
    });
  }

  async function preview() {
    setStage({ kind: "previewing" });
    try {
      const res = await fetch(`/api/documents/${sku.id}/preview`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values)
      });
      const data = await res.json();
      if (!res.ok) {
        setStage({
          kind: "error",
          message:
            typeof data.error === "string"
              ? `${data.error}${data.issues ? ": check the highlighted fields." : ""}`
              : "Preview failed."
        });
        return;
      }
      setStage({ kind: "preview", doc: data.document });
    } catch (e) {
      setStage({
        kind: "error",
        message: e instanceof Error ? e.message : "Preview failed."
      });
    }
  }

  async function commitDraft() {
    setStage({ kind: "saving" });
    try {
      const res = await fetch(`/api/documents`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sku: sku.id,
          input: values,
          addon_lawyer_review: addon
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setStage({ kind: "error", message: data.error ?? "Save failed." });
        return;
      }
      setStage({ kind: "ready", documentId: data.document_id, addon });
    } catch (e) {
      setStage({
        kind: "error",
        message: e instanceof Error ? e.message : "Save failed."
      });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {stage.kind !== "preview" && stage.kind !== "ready" ? (
        <>
          {spec.sections.map((section) => (
            <section key={section.title} className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
                {section.title}
              </h2>
              <div className="grid gap-3">
                {section.fields.map((f) => (
                  <Field key={f.name} field={f} value={getDeep(values, f.name)} onChange={update} />
                ))}
              </div>
            </section>
          ))}

          {sku.allow_addon_lawyer_review ? (
            <label className="flex items-start gap-3 rounded-md border border-neutral-200 p-3 text-sm">
              <input
                type="checkbox"
                checked={addon}
                onChange={(e) => setAddon(e.target.checked)}
                className="mt-1"
              />
              <span>
                Add lawyer review for an additional Rs 499. A qualified
                advocate will review the draft and reply within 24 hours.
              </span>
            </label>
          ) : null}

          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-600">
              {(sku.price_paise / 100).toLocaleString("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0
              })}
              {addon ? " + Rs 499 (lawyer review)" : null}
            </p>
            <Button type="button" onClick={preview} disabled={stage.kind === "previewing"}>
              {stage.kind === "previewing" ? "Generating preview..." : "Preview document"}
            </Button>
          </div>

          {stage.kind === "error" ? (
            <p className="text-sm text-red-600">{stage.message}</p>
          ) : null}
        </>
      ) : null}

      {stage.kind === "preview" ? (
        <div className="flex flex-col gap-6">
          <Disclaimer />
          <DocumentPreview doc={stage.doc} />
          <div className="flex flex-col gap-4 rounded-md border border-neutral-200 bg-neutral-50 p-4">
            <div>
              <p className="text-sm font-medium">Download your document</p>
              <p className="mt-1 text-xs text-neutral-600">
                The draft above is yours. Download it as a PDF or editable
                DOCX — free, no payment required.
              </p>
            </div>
            <FreeDownload skuId={sku.id} values={values} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button type="button" variant="ghost" onClick={() => setStage({ kind: "edit" })}>
                Back to edit
              </Button>
              <WhatsAppShare
                text={`I just generated my ${sku.title} free on LegalDesk AI. You can too: ${siteUrl ?? "https://legaldesk-ai.vercel.app"}`}
              />
              {razorpayConfigured ? (
                <Button type="button" onClick={commitDraft} disabled={stage.kind !== "preview"}>
                  Pay for delivery ({priceLabel(sku.price_paise, addon)})
                </Button>
              ) : null}
            </div>
            {razorpayConfigured ? (
              <p className="text-xs text-neutral-500">
                Paid delivery emails the branded PDF + DOCX
                {sku.allow_addon_lawyer_review ? " and unlocks lawyer review" : ""}.
              </p>
            ) : null}
          </div>

          {!razorpayConfigured && upiConfigured && sku.allow_addon_lawyer_review ? (
            <div className="rounded-md border border-ink-100 p-4">
              <p className="text-sm font-medium">Add lawyer review (₹499)</p>
              <p className="mt-1 text-xs text-neutral-600">
                A verified advocate reviews your draft and replies within 24
                hours. Pay via UPI — no card needed.
              </p>
              <div className="mt-3">
                <UpiCheckout
                  documentId={`addon-${sku.id}`}
                  idempotencyKey={`upi-addon-${sku.id}-${Date.now()}`}
                  amountLabel={priceLabel(0, true)}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {stage.kind === "ready" ? (
        <div className="flex flex-col gap-4 rounded-md border border-neutral-200 p-4">
          <p className="text-sm">
            Your draft has been saved. Pay below to receive the final PDF and DOCX
            by email and WhatsApp.
          </p>
          <CheckoutButton documentId={stage.documentId} addon={stage.addon} priceLabel={priceLabel(sku.price_paise, stage.addon)} />
          <Button type="button" variant="ghost" onClick={() => setStage({ kind: "edit" })}>
            Edit fields
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function priceLabel(base: number, addon: boolean): string {
  const total = base + (addon ? 499_00 : 0);
  return (total / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  });
}

function seedDefaults(spec: FormSpec): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const section of spec.sections) {
    for (const f of section.fields) {
      switch (f.kind) {
        case "checkbox":
          setDeep(out, f.name, f.defaultValue ?? false);
          break;
        case "select":
          if (f.defaultValue !== undefined) setDeep(out, f.name, f.defaultValue);
          break;
        case "multiselect":
          setDeep(out, f.name, []);
          break;
        case "list":
          setDeep(out, f.name, []);
          break;
      }
    }
  }
  return out;
}

interface FieldProps {
  field: FieldSpec;
  value: unknown;
  onChange: (path: string, value: unknown) => void;
}

function Field({ field, value, onChange }: FieldProps) {
  switch (field.kind) {
    case "text":
      return (
        <label className="flex flex-col gap-1 text-sm">
          <span className={field.required ? "" : "text-neutral-700"}>{field.label}{field.required ? " *" : ""}</span>
          <Input
            value={(value as string | undefined) ?? ""}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        </label>
      );
    case "textarea":
      return (
        <label className="flex flex-col gap-1 text-sm">
          <span>{field.label}{field.required ? " *" : ""}</span>
          <textarea
            rows={field.rows ?? 3}
            value={(value as string | undefined) ?? ""}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className="rounded-md border border-neutral-300 bg-white p-2 text-sm focus:border-neutral-900 focus:outline-none"
            required={field.required}
          />
        </label>
      );
    case "date":
      return (
        <label className="flex flex-col gap-1 text-sm">
          <span>{field.label}{field.required ? " *" : ""}</span>
          <Input
            type="date"
            value={(value as string | undefined) ?? ""}
            onChange={(e) => onChange(field.name, e.target.value)}
            required={field.required}
          />
        </label>
      );
    case "number":
      return (
        <label className="flex flex-col gap-1 text-sm">
          <span>{field.label}{field.required ? " *" : ""}</span>
          <Input
            type="number"
            value={
              typeof value === "number" || typeof value === "string"
                ? String(value)
                : ""
            }
            min={field.min}
            max={field.max}
            onChange={(e) => onChange(field.name, e.target.value === "" ? undefined : Number(e.target.value))}
            required={field.required}
          />
        </label>
      );
    case "select":
      return (
        <label className="flex flex-col gap-1 text-sm">
          <span>{field.label}{field.required ? " *" : ""}</span>
          <select
            value={(value as string | undefined) ?? field.defaultValue ?? ""}
            onChange={(e) => onChange(field.name, e.target.value)}
            className="rounded-md border border-neutral-300 bg-white p-2 text-sm focus:border-neutral-900 focus:outline-none"
            required={field.required}
          >
            <option value="" disabled>
              Select...
            </option>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      );
    case "checkbox":
      return (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(field.name, e.target.checked)}
          />
          <span>{field.label}</span>
        </label>
      );
    case "multiselect":
      return (
        <fieldset className="flex flex-col gap-1 text-sm">
          <legend>{field.label}</legend>
          <div className="flex flex-wrap gap-3">
            {field.options.map((o) => {
              const arr = Array.isArray(value) ? (value as string[]) : [];
              const checked = arr.includes(o.value);
              return (
                <label key={o.value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...arr, o.value]
                        : arr.filter((v) => v !== o.value);
                      onChange(field.name, next);
                    }}
                  />
                  <span>{o.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      );
    case "list":
      return (
        <ListField
          field={field}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={(next) => onChange(field.name, next)}
        />
      );
  }
}

function ListField({
  field,
  value,
  onChange
}: {
  field: Extract<FieldSpec, { kind: "list" }>;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <fieldset className="flex flex-col gap-2 text-sm">
      <legend>{field.label}</legend>
      <ul className="flex flex-col gap-1">
        {value.map((v, i) => (
          <li key={i} className="flex items-center gap-2 rounded-md border border-neutral-200 px-2 py-1">
            <span className="flex-1">{v}</span>
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="text-xs text-red-700 hover:underline"
            >
              remove
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={field.itemPlaceholder ?? "Add an item"}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const trimmed = draft.trim();
            if (trimmed.length === 0) return;
            if (field.maxItems && value.length >= field.maxItems) return;
            onChange([...value, trimmed]);
            setDraft("");
          }}
        >
          Add
        </Button>
      </div>
    </fieldset>
  );
}
