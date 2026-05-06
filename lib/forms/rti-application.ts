import type { FormSpec } from "./types";

export const rtiApplicationForm: FormSpec = {
  sections: [
    {
      title: "Applicant",
      fields: [
        { kind: "text", name: "applicant.name", label: "Full name", required: true },
        { kind: "textarea", name: "applicant.address", label: "Address", rows: 3, required: true },
        { kind: "text", name: "applicant.phone", label: "Phone", required: true },
        { kind: "text", name: "applicant.email", label: "Email" },
        { kind: "checkbox", name: "applicant.is_indian_citizen", label: "I am a citizen of India", defaultValue: true },
        { kind: "checkbox", name: "applicant.is_bpl", label: "I am below the poverty line (fee waiver under Section 7(5))" }
      ]
    },
    {
      title: "Public authority",
      fields: [
        { kind: "text", name: "public_authority.name", label: "Public authority name", required: true },
        { kind: "textarea", name: "public_authority.address", label: "Address", rows: 3, required: true },
        { kind: "text", name: "public_authority.pio_designation", label: "PIO designation (if known)" }
      ]
    },
    {
      title: "Information sought",
      fields: [
        { kind: "text", name: "subject", label: "Subject (one line)", required: true },
        {
          kind: "list",
          name: "information_sought",
          label: "Specific questions (one per line)",
          itemPlaceholder: "Enter a single question",
          minItems: 1,
          maxItems: 10
        },
        { kind: "date", name: "period.from", label: "Period start (optional)" },
        { kind: "date", name: "period.to", label: "Period end (optional)" },
        { kind: "checkbox", name: "prefer_inspection", label: "Prefer to inspect records" }
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
