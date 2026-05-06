// Declarative form spec consumed by DocumentForm. Each SKU has its
// own FormSpec; the client renderer walks it and assembles a nested
// object via dotted-path field names ("sender.address", etc.).

export interface SelectOption {
  label: string;
  value: string;
}

export type FieldSpec =
  | { kind: "text"; name: string; label: string; placeholder?: string; required?: boolean }
  | { kind: "textarea"; name: string; label: string; rows?: number; required?: boolean; placeholder?: string }
  | { kind: "date"; name: string; label: string; required?: boolean }
  | { kind: "number"; name: string; label: string; min?: number; max?: number; required?: boolean; suffix?: string }
  | { kind: "select"; name: string; label: string; options: SelectOption[]; required?: boolean; defaultValue?: string }
  | { kind: "checkbox"; name: string; label: string; defaultValue?: boolean }
  | { kind: "multiselect"; name: string; label: string; options: SelectOption[] }
  | { kind: "list"; name: string; label: string; itemPlaceholder?: string; minItems?: number; maxItems?: number };

export interface FormSection {
  title: string;
  fields: FieldSpec[];
}

export interface FormSpec {
  sections: FormSection[];
}

// ---------------------------------------------------------------------------
// dotted-path helpers
// ---------------------------------------------------------------------------
export function setDeep(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let cur: Record<string, unknown> = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (typeof cur[key] !== "object" || cur[key] === null) cur[key] = {};
    cur = cur[key] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

export function getDeep(source: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = source;
  for (const p of parts) {
    if (typeof cur !== "object" || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}
