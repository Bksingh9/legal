import type { DocumentRender } from "./types";
import { fmtDate } from "./types";
import type { ReplyLegalNoticeInputType } from "@/lib/skus/reply-legal-notice";

export function renderReplyLegalNotice(
  input: ReplyLegalNoticeInputType,
  ctx: { reference: string; generated_at: string }
): DocumentRender {
  const {
    our_party,
    opposing_party,
    original_notice,
    our_stance,
    rebuttal_points,
    counter_demand,
    reservation_of_rights,
    language
  } = input;

  const stanceParagraph = (() => {
    switch (our_stance) {
      case "deny":
        return "My client denies each and every allegation, averment, contention and assertion contained in your notice except those that are matters of record. The notice is misconceived in fact and untenable in law.";
      case "admit":
        return "While my client has noted the contents of your notice, the legal position outlined therein is incomplete. The matters of admission and denial appear in seriatim below.";
      case "partial":
        return "My client admits only those facts that are matters of record. The remaining allegations are denied as both factually inaccurate and legally untenable. A point-wise reply follows.";
    }
  })();

  return {
    title: "REPLY TO LEGAL NOTICE",
    subtitle: "Without Prejudice",
    language,
    meta: {
      sku: "reply-legal-notice",
      generated_at: ctx.generated_at,
      reference: ctx.reference
    },
    blocks: [
      {
        type: "address_block",
        lines: [
          our_party.name,
          our_party.address,
          our_party.email ? `Email: ${our_party.email}` : "",
          our_party.phone ? `Phone: ${our_party.phone}` : ""
        ].filter((x) => x.length > 0),
        align: "right"
      },
      { type: "spacer", size: "sm" },
      {
        type: "paragraph",
        text: `Dated: ${fmtDate(ctx.generated_at.slice(0, 10))}`
      },
      { type: "spacer", size: "sm" },
      {
        type: "address_block",
        lines: [
          "TO,",
          original_notice.sender_advocate ?? opposing_party.name,
          opposing_party.address
        ].filter(Boolean) as string[]
      },
      { type: "spacer", size: "md" },
      {
        type: "heading",
        text: `Subject: Reply to legal notice dated ${fmtDate(original_notice.date_received)}`,
        level: 2
      },
      { type: "spacer", size: "sm" },
      {
        type: "paragraph",
        text: `With reference to your notice dated ${fmtDate(original_notice.date_received)} concerning ${original_notice.subject_summary}, my client begs to submit as under.`
      },
      { type: "paragraph", text: stanceParagraph },
      { type: "heading", text: "Point-wise reply", level: 3 },
      { type: "numbered_list", items: rebuttal_points },
      ...(counter_demand
        ? [
            {
              type: "heading" as const,
              text: "Counter-claim and demand",
              level: 3 as const
            },
            { type: "paragraph" as const, text: counter_demand }
          ]
        : []),
      ...(reservation_of_rights
        ? [
            { type: "spacer" as const, size: "sm" as const },
            {
              type: "paragraph" as const,
              text:
                "My client expressly reserves all rights, contentions and remedies available in law and equity, and nothing in this reply shall be construed as a waiver thereof."
            }
          ]
        : []),
      { type: "spacer", size: "md" },
      {
        type: "signature_block",
        lines: ["Yours faithfully,", our_party.name, our_party.address]
      }
    ]
  };
}
