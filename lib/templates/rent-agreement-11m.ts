import type { DocumentRender } from "./types";
import { fmtDate, fmtINR, addMonths } from "./types";
import type { RentAgreementInputType } from "@/lib/skus/rent-agreement-11m";

export function renderRentAgreement(
  input: RentAgreementInputType,
  ctx: { reference: string; generated_at: string }
): DocumentRender {
  const { landlord, tenant, property, term, rent, city, inclusions, restrictions, language } = input;
  const endDate = addMonths(term.start_date, 11);

  const inclusionLine =
    inclusions.length > 0
      ? `The following are included in the monthly rent: ${inclusions.join(", ")}.`
      : "Society maintenance, electricity, water, internet and parking, unless explicitly listed above, are payable by the Tenant.";

  return {
    title: "AGREEMENT FOR LEAVE AND LICENCE",
    subtitle: `Eleven (11) months — ${city}`,
    language,
    meta: {
      sku: "rent-agreement-11m",
      generated_at: ctx.generated_at,
      reference: ctx.reference
    },
    blocks: [
      {
        type: "paragraph",
        text: `THIS AGREEMENT FOR LEAVE AND LICENCE is made and executed on this day, ${fmtDate(ctx.generated_at.slice(0, 10))}, at ${city}.`
      },
      { type: "heading", text: "BETWEEN", level: 2 },
      {
        type: "paragraph",
        text: `${landlord.name}, residing at ${landlord.address}${landlord.pan ? `, PAN: ${landlord.pan.toUpperCase()}` : ""}, hereinafter referred to as the "LICENSOR / LANDLORD" (which expression shall, unless repugnant to the context, mean and include the legal heirs and assigns).`
      },
      { type: "heading", text: "AND", level: 2 },
      {
        type: "paragraph",
        text: `${tenant.name}, residing at ${tenant.address}${tenant.pan ? `, PAN: ${tenant.pan.toUpperCase()}` : ""}, hereinafter referred to as the "LICENSEE / TENANT" (which expression shall, unless repugnant to the context, mean and include the legal heirs and assigns).`
      },
      { type: "heading", text: "WHEREAS", level: 2 },
      {
        type: "numbered_list",
        items: [
          `The Landlord is the absolute owner of the residential premises situated at ${property.full_address} (${property.type}, ${property.furnishing}) (the "Premises").`,
          `The Tenant has approached the Landlord for the grant of leave and licence to occupy the Premises for residential use, to which the Landlord has agreed on the terms and conditions set out below.`
        ]
      },
      { type: "heading", text: "NOW THIS AGREEMENT WITNESSETH AS FOLLOWS:", level: 2 },
      {
        type: "numbered_list",
        items: [
          `Term. The licence is granted for a period of eleven (11) months commencing from ${fmtDate(term.start_date)} and ending on ${fmtDate(endDate)}, both days inclusive, unless terminated earlier in accordance with this Agreement.`,
          `Rent. The Tenant shall pay a monthly licence fee of ${fmtINR(rent.monthly_inr)} on or before the ${ordinal(rent.payment_day_of_month)} day of each English calendar month, by NEFT/UPI to the Landlord's nominated account.${rent.annual_increment_pct > 0 ? ` Upon renewal, the rent shall stand revised upwards by ${rent.annual_increment_pct}% per annum.` : ""}`,
          `Security deposit. The Tenant has paid a refundable, interest-free security deposit of ${fmtINR(rent.deposit_inr)}, refundable within thirty (30) days of vacating the Premises, after deducting actual outstanding utility bills and damages, if any, beyond normal wear and tear.`,
          inclusionLine,
          restrictions
            ? `Restrictions and obligations. ${restrictions}`
            : `Restrictions and obligations. The Tenant shall use the Premises strictly for residential purposes, shall not sub-let or part with possession, and shall comply with all applicable society and municipal rules.`,
          `Termination. Either party may terminate this Agreement by giving the other not less than one (1) calendar month's prior written notice. The Tenant shall hand over peaceful, vacant and undamaged possession upon termination.`,
          `Jurisdiction. The Courts at ${city} shall have exclusive jurisdiction in all matters arising out of or in connection with this Agreement.`
        ]
      },
      { type: "spacer", size: "md" },
      {
        type: "paragraph",
        text:
          "IN WITNESS WHEREOF, the parties have set their hands to this Agreement on the day, month and year first above written, in the presence of the witnesses signing below."
      },
      { type: "spacer", size: "md" },
      {
        type: "signature_block",
        lines: [
          `LANDLORD: ${landlord.name}`,
          "(Signature: __________________________)",
          "",
          `TENANT: ${tenant.name}`,
          "(Signature: __________________________)",
          "",
          "WITNESS 1: ____________________________",
          "WITNESS 2: ____________________________"
        ]
      }
    ]
  };
}

function ordinal(n: number): string {
  if (n >= 11 && n <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}
