import type { FormSpec } from "./types";

export const rentAgreementForm: FormSpec = {
  sections: [
    {
      title: "Landlord",
      fields: [
        { kind: "text", name: "landlord.name", label: "Full name", required: true },
        { kind: "textarea", name: "landlord.address", label: "Address", rows: 3, required: true },
        { kind: "text", name: "landlord.pan", label: "PAN (optional)" }
      ]
    },
    {
      title: "Tenant",
      fields: [
        { kind: "text", name: "tenant.name", label: "Full name", required: true },
        { kind: "textarea", name: "tenant.address", label: "Address", rows: 3, required: true },
        { kind: "text", name: "tenant.pan", label: "PAN (optional)" }
      ]
    },
    {
      title: "Property",
      fields: [
        { kind: "textarea", name: "property.full_address", label: "Full property address", rows: 3, required: true },
        {
          kind: "select",
          name: "property.type",
          label: "Type",
          options: [
            { label: "1 RK", value: "1RK" },
            { label: "1 BHK", value: "1BHK" },
            { label: "2 BHK", value: "2BHK" },
            { label: "3 BHK", value: "3BHK" },
            { label: "4 BHK", value: "4BHK" },
            { label: "Studio", value: "Studio" },
            { label: "Other", value: "Other" }
          ],
          defaultValue: "1BHK",
          required: true
        },
        {
          kind: "select",
          name: "property.furnishing",
          label: "Furnishing",
          options: [
            { label: "Unfurnished", value: "unfurnished" },
            { label: "Semi-furnished", value: "semi-furnished" },
            { label: "Fully furnished", value: "fully-furnished" }
          ],
          defaultValue: "unfurnished",
          required: true
        }
      ]
    },
    {
      title: "Term and rent",
      fields: [
        { kind: "date", name: "term.start_date", label: "Start date", required: true },
        { kind: "number", name: "rent.monthly_inr", label: "Monthly rent (INR)", min: 1000, max: 100_00_000, required: true },
        { kind: "number", name: "rent.deposit_inr", label: "Security deposit (INR)", min: 0, max: 100_00_000, required: true },
        { kind: "number", name: "rent.payment_day_of_month", label: "Payment day of month (1-28)", min: 1, max: 28, required: true },
        { kind: "number", name: "rent.annual_increment_pct", label: "Annual rent increment (%)", min: 0, max: 20 }
      ]
    },
    {
      title: "Other terms",
      fields: [
        { kind: "text", name: "city", label: "City of jurisdiction", required: true },
        {
          kind: "multiselect",
          name: "inclusions",
          label: "What is included in the rent?",
          options: [
            { label: "Parking", value: "parking" },
            { label: "Society maintenance", value: "society-maintenance" },
            { label: "Water", value: "water" },
            { label: "Electricity", value: "electricity" },
            { label: "Internet", value: "internet" }
          ]
        },
        { kind: "textarea", name: "restrictions", label: "Restrictions (optional)", rows: 3 },
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
