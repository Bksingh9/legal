import type { FormSpec } from "./types";

export const chequeBounceS138Form: FormSpec = {
  sections: [
    {
      title: "Payee (you / your client)",
      fields: [
        { kind: "text", name: "drawee.name", label: "Full name / business name", required: true },
        { kind: "textarea", name: "drawee.address", label: "Address", rows: 3, required: true }
      ]
    },
    {
      title: "Drawer (the person who issued the cheque)",
      fields: [
        { kind: "text", name: "drawer.name", label: "Full name", required: true },
        { kind: "textarea", name: "drawer.address", label: "Address", rows: 3, required: true },
        { kind: "text", name: "drawer.email", label: "Email (if known)" },
        { kind: "text", name: "drawer.phone", label: "Phone (if known)" }
      ]
    },
    {
      title: "Cheque",
      fields: [
        { kind: "text", name: "cheque.number", label: "Cheque number", required: true },
        { kind: "date", name: "cheque.issued_on", label: "Date on the cheque", required: true },
        { kind: "number", name: "cheque.amount_inr", label: "Amount (INR)", min: 1, required: true },
        { kind: "text", name: "cheque.drawn_on_bank", label: "Bank", required: true },
        { kind: "text", name: "cheque.drawn_on_branch", label: "Branch", required: true }
      ]
    },
    {
      title: "Dishonour",
      fields: [
        { kind: "date", name: "dishonour.presented_on", label: "Cheque was presented on", required: true },
        { kind: "date", name: "dishonour.bank_memo_dated", label: "Bank's dishonour memo dated", required: true },
        {
          kind: "text",
          name: "dishonour.reason",
          label: "Reason on the memo",
          placeholder: "e.g. insufficient funds, exceeds arrangement",
          required: true
        }
      ]
    },
    {
      title: "Underlying transaction",
      fields: [
        {
          kind: "textarea",
          name: "underlying_transaction",
          label: "Describe the legally enforceable debt or liability the cheque was issued for",
          rows: 4,
          required: true,
          placeholder: "Payment for goods supplied per invoice no. … dated …"
        }
      ]
    }
  ]
};
