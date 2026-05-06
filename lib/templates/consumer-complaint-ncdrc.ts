import type { DocumentRender } from "./types";
import { fmtDate, fmtINR } from "./types";
import type { ConsumerComplaintInputType } from "@/lib/skus/consumer-complaint-ncdrc";

const FORUM_TITLES: Record<ConsumerComplaintInputType["forum"], string> = {
  district: "BEFORE THE DISTRICT CONSUMER DISPUTES REDRESSAL COMMISSION",
  state: "BEFORE THE STATE CONSUMER DISPUTES REDRESSAL COMMISSION",
  national: "BEFORE THE NATIONAL CONSUMER DISPUTES REDRESSAL COMMISSION"
};

const RELIEF_LABELS: Record<
  ConsumerComplaintInputType["reliefs_sought"][number],
  string
> = {
  refund: "Direct the Opposite Party to refund the consideration paid by the Complainant.",
  replacement: "Direct the Opposite Party to replace the goods/service with one conforming to the agreed specification.",
  repair: "Direct the Opposite Party to remedy the defect at its own cost.",
  compensation: "Award compensation for the mental agony, harassment and inconvenience caused.",
  interest: "Award interest at such rate as this Hon'ble Commission deems fit, from the date of cause of action till realisation.",
  litigation_costs: "Award the costs of these proceedings."
};

export function renderConsumerComplaint(
  input: ConsumerComplaintInputType,
  ctx: { reference: string; generated_at: string }
): DocumentRender {
  const {
    complainant,
    opposite_party,
    transaction,
    defect,
    prior_resolution_attempts,
    reliefs_sought,
    forum,
    language
  } = input;

  return {
    title: FORUM_TITLES[forum],
    subtitle: `Complaint No. _____ of ${ctx.generated_at.slice(0, 4)}`,
    language,
    meta: {
      sku: "consumer-complaint-ncdrc",
      generated_at: ctx.generated_at,
      reference: ctx.reference
    },
    blocks: [
      { type: "heading", text: "IN THE MATTER OF:", level: 2 },
      {
        type: "address_block",
        lines: [
          `${complainant.name}`,
          `${complainant.address}`,
          complainant.occupation ? `Occupation: ${complainant.occupation}` : "",
          `Phone: ${complainant.phone}`,
          complainant.email ? `Email: ${complainant.email}` : "",
          "",
          "...COMPLAINANT"
        ].filter((x) => x.length > 0)
      },
      { type: "spacer", size: "sm" },
      { type: "heading", text: "VERSUS", level: 3 },
      {
        type: "address_block",
        lines: [opposite_party.name, opposite_party.address, "", "...OPPOSITE PARTY"]
      },
      { type: "spacer", size: "md" },
      {
        type: "heading",
        text: "COMPLAINT UNDER SECTION 35 OF THE CONSUMER PROTECTION ACT, 2019",
        level: 2
      },
      {
        type: "paragraph",
        text: "The Complainant most respectfully submits as under:"
      },
      {
        type: "numbered_list",
        items: [
          `That the Complainant is a "consumer" within the meaning of Section 2(7) of the Consumer Protection Act, 2019.`,
          `That on ${fmtDate(transaction.purchase_date)}, the Complainant availed the goods / services described as: ${transaction.description}, for valuable consideration of ${fmtINR(transaction.amount_inr)}${transaction.invoice_no ? ` vide invoice number ${transaction.invoice_no}` : ""}.`,
          `That the Opposite Party has rendered deficient service / supplied defective goods, in that ${defect}.`,
          prior_resolution_attempts
            ? `That, prior to the institution of this complaint, the Complainant attempted to resolve the matter directly with the Opposite Party as follows: ${prior_resolution_attempts}. The said attempts did not yield any redressal.`
            : `That, despite communications addressed to the Opposite Party, no redressal has been forthcoming, leaving the Complainant with no option but to approach this Hon'ble Commission.`,
          `That the cause of action arose on ${fmtDate(transaction.purchase_date)} and continues to subsist as the deficiency / defect has not been cured. The pecuniary jurisdiction of this Hon'ble Commission is satisfied as the value of the goods / services together with compensation does not exceed the prescribed monetary limit.`
        ]
      },
      { type: "heading", text: "PRAYER", level: 3 },
      {
        type: "paragraph",
        text:
          "It is therefore most respectfully prayed that this Hon'ble Commission be pleased to:"
      },
      {
        type: "numbered_list",
        items: reliefs_sought.map((r) => RELIEF_LABELS[r])
      },
      {
        type: "paragraph",
        text:
          "And pass any other or further order(s) in favour of the Complainant as this Hon'ble Commission may deem fit and proper in the facts and circumstances of the case, in the interests of justice."
      },
      { type: "spacer", size: "md" },
      {
        type: "signature_block",
        lines: [
          `Place: ${complainant.address.split(",").slice(-1)[0]?.trim() ?? ""}`,
          `Date: ${fmtDate(ctx.generated_at.slice(0, 10))}`,
          "",
          `${complainant.name}`,
          "Complainant in person"
        ]
      }
    ]
  };
}
