import type { FormSpec } from "./types";

export const legalNoticeForm: FormSpec = {
  sections: [
    {
      title: "Sender (you / your client)",
      fields: [
        { kind: "text", name: "sender.name", label: "Full name", required: true },
        { kind: "textarea", name: "sender.address", label: "Address", rows: 3, required: true },
        { kind: "text", name: "sender.email", label: "Email" },
        { kind: "text", name: "sender.phone", label: "Phone" }
      ]
    },
    {
      title: "Recipient",
      fields: [
        { kind: "text", name: "recipient.name", label: "Full name", required: true },
        { kind: "textarea", name: "recipient.address", label: "Address", rows: 3, required: true }
      ]
    },
    {
      title: "Cause of action",
      fields: [
        { kind: "date", name: "cause.date_of_event", label: "Date of event", required: true },
        { kind: "text", name: "cause.place", label: "Place", required: true },
        {
          kind: "textarea",
          name: "cause.description",
          label: "Describe what happened, in plain language",
          rows: 6,
          required: true
        }
      ]
    },
    {
      title: "Demand",
      fields: [
        {
          kind: "textarea",
          name: "demand.summary",
          label: "What action are you demanding?",
          rows: 3,
          required: true,
          placeholder: "e.g. Refund the security deposit of Rs 50,000 and vacate the unauthorised possession."
        },
        {
          kind: "number",
          name: "demand.amount_inr",
          label: "Monetary demand (INR, optional)",
          min: 0,
          max: 100_00_00_000
        },
        {
          kind: "number",
          name: "demand.deadline_days",
          label: "Deadline (days from receipt)",
          min: 3,
          max: 180,
          required: true
        }
      ]
    },
    {
      title: "Optional",
      fields: [
        { kind: "text", name: "legal_basis", label: "Legal basis (Act / section)" },
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
