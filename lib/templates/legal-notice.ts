import type { DocumentRender } from "./types";
import { fmtDate, fmtINR } from "./types";
import type { LegalNoticeInputType } from "@/lib/skus/legal-notice";

export function renderLegalNotice(
  input: LegalNoticeInputType,
  ctx: { reference: string; generated_at: string }
): DocumentRender {
  const { sender, recipient, cause, demand, legal_basis, language } = input;

  const senderContact = [
    sender.name,
    sender.address,
    sender.email ? `Email: ${sender.email}` : "",
    sender.phone ? `Phone: ${sender.phone}` : ""
  ]
    .filter((x) => x.length > 0);

  const recipientContact = [recipient.name, recipient.address];

  const amountFragment = demand.amount_inr
    ? ` along with a sum of ${fmtINR(demand.amount_inr)} towards damages and ancillary relief`
    : "";

  return {
    title: "LEGAL NOTICE",
    subtitle: "Without Prejudice",
    language,
    meta: {
      sku: "legal-notice",
      generated_at: ctx.generated_at,
      reference: ctx.reference
    },
    blocks: [
      { type: "address_block", lines: senderContact, align: "right" },
      { type: "spacer", size: "sm" },
      {
        type: "paragraph",
        text: `Dated: ${fmtDate(ctx.generated_at.slice(0, 10))}`
      },
      { type: "spacer", size: "sm" },
      { type: "address_block", lines: ["TO,", ...recipientContact] },
      { type: "spacer", size: "md" },
      { type: "heading", text: "Subject: Legal Notice", level: 2 },
      { type: "spacer", size: "sm" },
      {
        type: "paragraph",
        text:
          `Under instructions from and on behalf of my client, I hereby serve you with the following legal notice.`
      },
      {
        type: "numbered_list",
        items: [
          `That on ${fmtDate(cause.date_of_event)} at ${cause.place}, the following events transpired: ${cause.description}`,
          `That the said acts and omissions have caused my client demonstrable loss and inconvenience, for which you are squarely liable in law.`,
          legal_basis
            ? `That the conduct described above is actionable under ${legal_basis}.`
            : `That the conduct described above is actionable under the applicable provisions of Indian law.`,
          `That you are hereby called upon to ${demand.summary}${amountFragment}, within ${demand.deadline_days} (${numberToWordsCapped(demand.deadline_days)}) days from the date of receipt of this notice.`
        ]
      },
      {
        type: "paragraph",
        text:
          `TAKE FURTHER NOTICE that, failing compliance within the stipulated period, my client shall be constrained to initiate appropriate civil and / or criminal proceedings against you at your risk as to costs and consequences, all of which please note.`
      },
      { type: "spacer", size: "md" },
      {
        type: "signature_block",
        lines: [
          "Yours faithfully,",
          sender.name,
          sender.address
        ]
      }
    ]
  };
}

function numberToWordsCapped(n: number): string {
  // Compact words for 1..30; otherwise just digits.
  const words: Record<number, string> = {
    1: "one", 2: "two", 3: "three", 4: "four", 5: "five",
    6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten",
    11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen",
    15: "fifteen", 16: "sixteen", 17: "seventeen", 18: "eighteen",
    19: "nineteen", 20: "twenty", 21: "twenty-one", 22: "twenty-two",
    23: "twenty-three", 24: "twenty-four", 25: "twenty-five",
    26: "twenty-six", 27: "twenty-seven", 28: "twenty-eight",
    29: "twenty-nine", 30: "thirty"
  };
  return words[n] ?? String(n);
}
