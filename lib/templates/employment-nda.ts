import type { DocumentRender } from "./types";
import { fmtDate } from "./types";
import type { EmploymentNdaInputType } from "@/lib/skus/employment-nda";

export function renderEmploymentNda(
  input: EmploymentNdaInputType,
  ctx: { reference: string; generated_at: string }
): DocumentRender {
  const {
    disclosing_party,
    receiving_party,
    effective_date,
    scope,
    confidential_items,
    term_years,
    non_compete_months,
    governing_state,
    jurisdiction_city,
    language
  } = input;

  return {
    title: "NON-DISCLOSURE AGREEMENT",
    subtitle: "Employment / engagement context",
    language,
    meta: {
      sku: "employment-nda",
      generated_at: ctx.generated_at,
      reference: ctx.reference
    },
    blocks: [
      {
        type: "paragraph",
        text: `This Non-Disclosure Agreement (the "Agreement") is made and entered into on ${fmtDate(effective_date)} (the "Effective Date") by and between:`
      },
      { type: "spacer", size: "sm" },
      {
        type: "paragraph",
        text: `${disclosing_party.name}, having its place of business at ${disclosing_party.address}, ${disclosing_party.state} (the "Company" or "Disclosing Party"), of the FIRST PART;`
      },
      { type: "paragraph", text: "AND" },
      {
        type: "paragraph",
        text: `${receiving_party.name}, residing at ${receiving_party.address}, engaged as ${receiving_party.role} (the "Receiving Party"), of the SECOND PART.`
      },
      { type: "spacer", size: "md" },
      { type: "heading", text: "WHEREAS", level: 3 },
      {
        type: "paragraph",
        text: `The Company is engaged in: ${scope} (the "Business"). In the course of the Receiving Party's engagement with the Company, the Company will share information of a confidential and proprietary nature with the Receiving Party. The parties enter this Agreement to protect such information.`
      },
      { type: "spacer", size: "md" },
      { type: "heading", text: "NOW THEREFORE, THE PARTIES AGREE AS FOLLOWS", level: 3 },
      { type: "heading", text: "1. Confidential Information", level: 3 },
      {
        type: "paragraph",
        text: "\"Confidential Information\" means information, whether or not marked confidential, disclosed by the Company to the Receiving Party that is not generally known and includes, without limitation:"
      },
      { type: "bullet_list", items: confidential_items },
      { type: "heading", text: "2. Obligations of the Receiving Party", level: 3 },
      { type: "numbered_list", items: [
        "Use Confidential Information solely for the purposes of the engagement with the Company.",
        "Not disclose Confidential Information to any third party without the Company's prior written consent.",
        "Protect Confidential Information with at least the same degree of care as the Receiving Party uses for its own confidential information, and in any event no less than a reasonable standard of care.",
        "Return or destroy all Confidential Information upon termination of the engagement or upon the Company's written request."
      ]},
      { type: "heading", text: "3. Exclusions", level: 3 },
      {
        type: "paragraph",
        text: "Confidential Information does not include information that: (a) is or becomes publicly available through no breach of this Agreement; (b) was rightfully known to the Receiving Party before disclosure by the Company; (c) is independently developed by the Receiving Party without use of Confidential Information; or (d) is required to be disclosed by law or by a competent court order, provided the Receiving Party gives prompt notice to the Company."
      },
      { type: "heading", text: "4. Term", level: 3 },
      {
        type: "paragraph",
        text: `This Agreement remains in effect for ${term_years} year${term_years === 1 ? "" : "s"} from the Effective Date, and the obligations of confidentiality shall survive termination of the engagement for the same period.`
      },
      ...(non_compete_months > 0
        ? [
            { type: "heading" as const, text: "5. Non-compete", level: 3 as const },
            {
              type: "paragraph" as const,
              text: `For a period of ${non_compete_months} month${non_compete_months === 1 ? "" : "s"} following termination of the engagement, the Receiving Party shall not, directly or indirectly, engage in any business that competes with the Business of the Company within India. The parties acknowledge that the scope, duration and geographic reach of this restriction are reasonable and necessary to protect the Company's legitimate interests.`
            }
          ]
        : []),
      { type: "heading", text: `${non_compete_months > 0 ? "6" : "5"}. Governing law and jurisdiction`, level: 3 },
      {
        type: "paragraph",
        text: `This Agreement is governed by the laws of India and the State of ${governing_state}. The courts at ${jurisdiction_city} shall have exclusive jurisdiction over any disputes arising out of or in connection with this Agreement.`
      },
      { type: "heading", text: `${non_compete_months > 0 ? "7" : "6"}. Remedies`, level: 3 },
      {
        type: "paragraph",
        text: "The Receiving Party acknowledges that any breach of this Agreement may cause irreparable harm to the Company and that monetary damages alone may be insufficient. The Company shall be entitled to seek injunctive relief, in addition to any other remedies available at law or in equity."
      },
      { type: "spacer", size: "lg" },
      {
        type: "paragraph",
        text: "IN WITNESS WHEREOF the parties have executed this Agreement as of the Effective Date written above."
      },
      { type: "spacer", size: "md" },
      {
        type: "signature_block",
        lines: [
          `For the Company: ${disclosing_party.name}`,
          "",
          "Signature: __________________________",
          "Name:",
          "Title:",
          "Date:"
        ]
      },
      { type: "spacer", size: "md" },
      {
        type: "signature_block",
        lines: [
          `Receiving Party: ${receiving_party.name}`,
          "",
          "Signature: __________________________",
          "Date:"
        ]
      },
      {
        type: "paragraph",
        text: `Reference: ${ctx.reference}`
      }
    ]
  };
}
