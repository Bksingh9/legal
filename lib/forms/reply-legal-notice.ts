import type { FormSpec } from "./types";

export const replyLegalNoticeForm: FormSpec = {
  sections: [
    {
      title: "Your party",
      fields: [
        { kind: "text", name: "our_party.name", label: "Your full name", required: true },
        { kind: "textarea", name: "our_party.address", label: "Your address", rows: 3, required: true },
        { kind: "text", name: "our_party.email", label: "Email" },
        { kind: "text", name: "our_party.phone", label: "Phone" }
      ]
    },
    {
      title: "Opposing party",
      fields: [
        { kind: "text", name: "opposing_party.name", label: "Opposing party name", required: true },
        { kind: "textarea", name: "opposing_party.address", label: "Opposing party address", rows: 3, required: true }
      ]
    },
    {
      title: "Original notice",
      fields: [
        { kind: "date", name: "original_notice.date_received", label: "Date you received the notice", required: true },
        { kind: "text", name: "original_notice.sender_advocate", label: "Sender's advocate (if any)" },
        {
          kind: "textarea",
          name: "original_notice.subject_summary",
          label: "Brief summary of the notice subject",
          rows: 3,
          required: true
        }
      ]
    },
    {
      title: "Your reply",
      fields: [
        {
          kind: "select",
          name: "our_stance",
          label: "Your stance",
          options: [
            { label: "Deny everything", value: "deny" },
            { label: "Admit (with qualifications)", value: "admit" },
            { label: "Partial - admit some, deny some", value: "partial" }
          ],
          defaultValue: "deny",
          required: true
        },
        {
          kind: "list",
          name: "rebuttal_points",
          label: "Point-wise rebuttal (one bullet per line)",
          itemPlaceholder: "Enter a single rebuttal point",
          minItems: 1,
          maxItems: 8
        },
        { kind: "textarea", name: "counter_demand", label: "Counter-demand (optional)", rows: 3 },
        { kind: "checkbox", name: "reservation_of_rights", label: "Add reservation-of-rights clause", defaultValue: true }
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
