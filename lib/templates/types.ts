// Structured document representation. Both the PDF and DOCX renderers
// walk a DocumentRender so we can keep templates as pure data without
// coupling them to a layout engine.

export type DocumentBlock =
  | { type: "heading"; text: string; level?: 1 | 2 | 3 }
  | { type: "paragraph"; text: string }
  | { type: "numbered_list"; items: string[] }
  | { type: "bullet_list"; items: string[] }
  | { type: "address_block"; lines: string[]; align?: "left" | "right" }
  | { type: "signature_block"; lines: string[] }
  | { type: "spacer"; size?: "sm" | "md" | "lg" };

export interface DocumentRender {
  title: string;
  subtitle?: string;
  language: "en" | "hi";
  meta: {
    sku: string;
    generated_at: string;
    reference: string;
  };
  blocks: DocumentBlock[];
}

export function fmtINR(amountInr: number | undefined): string {
  if (typeof amountInr !== "number") return "";
  // Indian numbering with lakh / crore separators.
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amountInr);
}

export function fmtDate(iso: string): string {
  // YYYY-MM-DD -> DD Month YYYY
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const month = months[Number(m[2]) - 1] ?? "";
  return `${m[3]} ${month} ${m[1]}`;
}

export function addMonths(isoStart: string, months: number): string {
  const [y, m, d] = isoStart.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCMonth(date.getUTCMonth() + months);
  // End-of-month overflow guard
  if (date.getUTCDate() !== d) date.setUTCDate(0);
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
