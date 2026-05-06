import type { FormSpec } from "./types";

export const consumerComplaintForm: FormSpec = {
  sections: [
    {
      title: "Forum",
      fields: [
        {
          kind: "select",
          name: "forum",
          label: "Forum",
          options: [
            { label: "District Commission", value: "district" },
            { label: "State Commission", value: "state" },
            { label: "National Commission (NCDRC)", value: "national" }
          ],
          defaultValue: "district",
          required: true
        }
      ]
    },
    {
      title: "Complainant",
      fields: [
        { kind: "text", name: "complainant.name", label: "Full name", required: true },
        { kind: "textarea", name: "complainant.address", label: "Address", rows: 3, required: true },
        { kind: "text", name: "complainant.occupation", label: "Occupation" },
        { kind: "text", name: "complainant.phone", label: "Phone", required: true },
        { kind: "text", name: "complainant.email", label: "Email" }
      ]
    },
    {
      title: "Opposite party",
      fields: [
        { kind: "text", name: "opposite_party.name", label: "Name of seller / service provider", required: true },
        { kind: "textarea", name: "opposite_party.address", label: "Address", rows: 3, required: true }
      ]
    },
    {
      title: "Transaction",
      fields: [
        { kind: "textarea", name: "transaction.description", label: "What did you buy / use?", rows: 3, required: true },
        { kind: "date", name: "transaction.purchase_date", label: "Purchase / service date", required: true },
        { kind: "number", name: "transaction.amount_inr", label: "Amount paid (INR)", min: 1, max: 10_00_00_000, required: true },
        { kind: "text", name: "transaction.invoice_no", label: "Invoice / order no." }
      ]
    },
    {
      title: "Defect and prior attempts",
      fields: [
        { kind: "textarea", name: "defect", label: "Defect / deficiency in detail", rows: 5, required: true },
        { kind: "textarea", name: "prior_resolution_attempts", label: "Prior resolution attempts (optional)", rows: 3 }
      ]
    },
    {
      title: "Reliefs sought",
      fields: [
        {
          kind: "multiselect",
          name: "reliefs_sought",
          label: "Select all that apply",
          options: [
            { label: "Refund", value: "refund" },
            { label: "Replacement", value: "replacement" },
            { label: "Repair", value: "repair" },
            { label: "Compensation", value: "compensation" },
            { label: "Interest", value: "interest" },
            { label: "Litigation costs", value: "litigation_costs" }
          ]
        }
      ]
    },
    {
      title: "Optional",
      fields: [
        {
          kind: "select",
          name: "language",
          label: "Output language",
          options: [
            { label: "English", value: "en" },
            { label: "Hindi", value: "hi" }
          ],
          defaultValue: "en"
        }
      ]
    }
  ]
};
