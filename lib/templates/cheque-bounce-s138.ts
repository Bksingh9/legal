import type { DocumentRender } from "./types";
import { fmtDate, fmtINR } from "./types";
import type { ChequeBounceS138InputType } from "@/lib/skus/cheque-bounce-s138";

export function renderChequeBounceS138(
  input: ChequeBounceS138InputType,
  ctx: { reference: string; generated_at: string }
): DocumentRender {
  const { drawer, drawee, cheque, dishonour, underlying_transaction, language } = input;
  const fifteenDaysFromMemo = new Date(dishonour.bank_memo_dated);
  fifteenDaysFromMemo.setDate(fifteenDaysFromMemo.getDate() + 15);

  return {
    title: "LEGAL NOTICE UNDER SECTION 138 OF THE NEGOTIABLE INSTRUMENTS ACT, 1881",
    subtitle: "Read with Section 142 NI Act",
    language,
    meta: {
      sku: "cheque-bounce-s138",
      generated_at: ctx.generated_at,
      reference: ctx.reference
    },
    blocks: [
      {
        type: "address_block",
        align: "right",
        lines: [
          drawee.name,
          drawee.address,
          `Dated: ${fmtDate(new Date(ctx.generated_at).toISOString().slice(0, 10))}`
        ]
      },
      { type: "spacer", size: "md" },
      {
        type: "address_block",
        lines: [
          "To,",
          drawer.name,
          drawer.address
        ]
      },
      { type: "spacer", size: "md" },
      {
        type: "heading",
        text: `Subject: Statutory notice under Section 138 of the Negotiable Instruments Act, 1881 in respect of dishonoured cheque no. ${cheque.number} dated ${fmtDate(cheque.issued_on)} for ${fmtINR(cheque.amount_inr)}`,
        level: 2
      },
      { type: "spacer", size: "sm" },
      { type: "paragraph", text: "Sir/Madam," },
      {
        type: "paragraph",
        text: `Under instructions from and on behalf of my client, ${drawee.name}, residing/having office at ${drawee.address} (the "Payee"), I hereby serve upon you the following statutory notice:`
      },
      { type: "numbered_list", items: [
        `That you, the "Drawer", issued cheque no. ${cheque.number} dated ${fmtDate(cheque.issued_on)} for ${fmtINR(cheque.amount_inr)} drawn on ${cheque.drawn_on_bank}, ${cheque.drawn_on_branch} ("the Cheque"), in favour of the Payee.`,
        `That the Cheque was issued towards a legally enforceable debt/liability arising from the following transaction: ${underlying_transaction}`,
        `That the Cheque was presented for payment through the Payee's banker on ${fmtDate(dishonour.presented_on)}.`,
        `That the Cheque was returned dishonoured with the remark "${dishonour.reason}" vide the drawee bank's memo dated ${fmtDate(dishonour.bank_memo_dated)}.`,
        `That, by virtue of Section 138 of the Negotiable Instruments Act, 1881, you have hereby committed an offence punishable with imprisonment for a term which may extend to two years, or with fine which may extend to twice the amount of the cheque, or with both.`,
        `That you are hereby called upon to make payment of ${fmtINR(cheque.amount_inr)} (Rupees ${cheque.amount_inr.toLocaleString("en-IN")} only), being the amount covered by the Cheque, to my client within FIFTEEN (15) DAYS from the date of receipt of this notice, failing which my client shall be constrained to file a criminal complaint under Section 138 read with Section 142 of the said Act, before the competent court, entirely at your risk as to costs and consequences.`
      ]},
      { type: "spacer", size: "md" },
      {
        type: "paragraph",
        text: `Please note: the statutory window for compliance expires on ${fmtDate(fifteenDaysFromMemo.toISOString().slice(0, 10))} (15 days from the bank memo dated ${fmtDate(dishonour.bank_memo_dated)}).`
      },
      { type: "spacer", size: "md" },
      { type: "paragraph", text: "Govern yourself accordingly." },
      { type: "spacer", size: "lg" },
      {
        type: "signature_block",
        lines: [
          "Yours faithfully,",
          "",
          "For " + drawee.name,
          "(Authorised signatory)"
        ]
      },
      {
        type: "paragraph",
        text: `Reference: ${ctx.reference}`
      }
    ]
  };
}
