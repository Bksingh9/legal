import type { DocumentRender } from "./types";
import { fmtDate } from "./types";
import type { RtiApplicationInputType } from "@/lib/skus/rti-application";

export function renderRtiApplication(
  input: RtiApplicationInputType,
  ctx: { reference: string; generated_at: string }
): DocumentRender {
  const { applicant, public_authority, subject, information_sought, period, prefer_inspection, language } = input;

  const periodLine = period?.from && period?.to
    ? `Period of information: ${fmtDate(period.from)} to ${fmtDate(period.to)}.`
    : period?.from
      ? `Period of information: from ${fmtDate(period.from)}.`
      : period?.to
        ? `Period of information: until ${fmtDate(period.to)}.`
        : "";

  return {
    title: "APPLICATION UNDER THE RIGHT TO INFORMATION ACT, 2005",
    subtitle: "Section 6(1)",
    language,
    meta: {
      sku: "rti-application",
      generated_at: ctx.generated_at,
      reference: ctx.reference
    },
    blocks: [
      {
        type: "address_block",
        lines: [
          "To,",
          public_authority.pio_designation ?? "The Public Information Officer",
          public_authority.name,
          public_authority.address
        ]
      },
      { type: "spacer", size: "md" },
      { type: "heading", text: `Subject: ${subject}`, level: 2 },
      { type: "spacer", size: "sm" },
      {
        type: "paragraph",
        text: `Sir / Madam, under the provisions of Section 6(1) of the Right to Information Act, 2005, I, ${applicant.name}, residing at ${applicant.address}, request the following information from your office.`
      },
      ...(periodLine ? [{ type: "paragraph" as const, text: periodLine }] : []),
      { type: "heading", text: "Information sought:", level: 3 },
      { type: "numbered_list", items: information_sought },
      ...(prefer_inspection
        ? [
            {
              type: "paragraph" as const,
              text:
                "I would prefer to inspect the relevant records on a mutually convenient date in addition to receiving certified copies."
            }
          ]
        : []),
      {
        type: "paragraph",
        text: applicant.is_bpl
          ? "I belong to a household below the poverty line and am therefore entitled to a fee waiver under Section 7(5) of the Act. A copy of the BPL certificate is enclosed."
          : "The application fee of Rs. 10/- as prescribed is enclosed by way of postal order / IPO. Please intimate any additional fee for furnishing the information so that the same may be remitted promptly."
      },
      {
        type: "paragraph",
        text: applicant.is_indian_citizen
          ? "I declare that I am a citizen of India."
          : "I am a resident of India and undertake to provide proof of identity if so required."
      },
      { type: "spacer", size: "md" },
      {
        type: "signature_block",
        lines: [
          `Date: ${fmtDate(ctx.generated_at.slice(0, 10))}`,
          `Place: ${applicant.address.split(",").slice(-1)[0]?.trim() ?? ""}`,
          "",
          `${applicant.name}`,
          `Phone: ${applicant.phone}`,
          applicant.email ? `Email: ${applicant.email}` : ""
        ].filter((x) => x.length > 0)
      }
    ]
  };
}
