import type { FormSpec } from "./types";

export const employmentNdaForm: FormSpec = {
  sections: [
    {
      title: "Effective date",
      fields: [
        {
          kind: "date",
          name: "effective_date",
          label: "Effective date",
          required: true
        }
      ]
    },
    {
      title: "Company (disclosing party)",
      fields: [
        { kind: "text", name: "disclosing_party.name", label: "Company name", required: true },
        { kind: "textarea", name: "disclosing_party.address", label: "Address", rows: 3, required: true },
        { kind: "text", name: "disclosing_party.state", label: "State (governing law)", required: true }
      ]
    },
    {
      title: "Receiving party (employee / contractor)",
      fields: [
        { kind: "text", name: "receiving_party.name", label: "Full name", required: true },
        { kind: "textarea", name: "receiving_party.address", label: "Address", rows: 3, required: true },
        {
          kind: "text",
          name: "receiving_party.role",
          label: "Role / capacity",
          placeholder: "e.g. Software Engineer, Contractor",
          required: true
        }
      ]
    },
    {
      title: "Scope",
      fields: [
        {
          kind: "textarea",
          name: "scope",
          label: "Describe the company's business (what the receiving party will be exposed to)",
          rows: 4,
          required: true
        },
        {
          kind: "list",
          name: "confidential_items",
          label: "Categories of confidential information (add one per line, 1–15 items)",
          itemPlaceholder: "e.g. source code, customer lists, pricing models",
          maxItems: 15
        }
      ]
    },
    {
      title: "Term + non-compete",
      fields: [
        {
          kind: "number",
          name: "term_years",
          label: "Confidentiality term (years)",
          min: 1,
          max: 20,
          required: true
        },
        {
          kind: "number",
          name: "non_compete_months",
          label: "Non-compete period (months, 0 to omit)",
          min: 0,
          max: 36,
          required: true
        }
      ]
    },
    {
      title: "Jurisdiction",
      fields: [
        {
          kind: "text",
          name: "governing_state",
          label: "Governing state",
          placeholder: "e.g. Karnataka",
          required: true
        },
        {
          kind: "text",
          name: "jurisdiction_city",
          label: "Exclusive jurisdiction (city)",
          placeholder: "e.g. Bengaluru",
          required: true
        }
      ]
    }
  ]
};
