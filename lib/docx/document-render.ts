import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
  LevelFormat,
  convertInchesToTwip
} from "docx";
import type { DocumentRender, DocumentBlock } from "@/lib/templates/types";
import { TRIAGE_DISCLAIMER } from "@/lib/anthropic/prompts";

const NUMBERED_REF = "ld-numbered";

function blockToParagraphs(b: DocumentBlock): Paragraph[] {
  switch (b.type) {
    case "heading":
      return [
        new Paragraph({
          text: b.text,
          heading: b.level === 3 ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 80 }
        })
      ];
    case "paragraph":
      return [
        new Paragraph({
          children: [new TextRun(b.text)],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 160 }
        })
      ];
    case "numbered_list":
      return b.items.map(
        (it) =>
          new Paragraph({
            children: [new TextRun(it)],
            numbering: { reference: NUMBERED_REF, level: 0 },
            spacing: { after: 120 }
          })
      );
    case "bullet_list":
      return b.items.map(
        (it) =>
          new Paragraph({
            children: [new TextRun(`• ${it}`)],
            indent: { left: convertInchesToTwip(0.25) },
            spacing: { after: 80 }
          })
      );
    case "address_block":
      return b.lines.map(
        (l) =>
          new Paragraph({
            children: [new TextRun(l)],
            alignment:
              b.align === "right" ? AlignmentType.RIGHT : AlignmentType.LEFT,
            spacing: { after: 40 }
          })
      );
    case "signature_block":
      return b.lines.map(
        (l) =>
          new Paragraph({
            children: [new TextRun(l)],
            spacing: { after: 60 }
          })
      );
    case "spacer":
      return [
        new Paragraph({
          text: "",
          spacing: {
            after: b.size === "lg" ? 480 : b.size === "md" ? 240 : 120
          }
        })
      ];
  }
}

export async function renderDocumentDocx(doc: DocumentRender): Promise<Buffer> {
  const titleP = new Paragraph({
    children: [new TextRun({ text: doc.title, bold: true })],
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 }
  });
  const subtitleP = doc.subtitle
    ? new Paragraph({
        children: [new TextRun({ text: doc.subtitle, italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 320 }
      })
    : null;

  const bodyParas = doc.blocks.flatMap(blockToParagraphs);

  const disclaimerP = new Paragraph({
    children: [new TextRun({ text: TRIAGE_DISCLAIMER, italics: true })],
    spacing: { before: 480 }
  });

  const docx = new Document({
    creator: "LegalDesk AI",
    title: doc.title,
    description: doc.meta.sku,
    numbering: {
      config: [
        {
          reference: NUMBERED_REF,
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.START,
              style: {
                paragraph: { indent: { left: convertInchesToTwip(0.5), hanging: 260 } }
              }
            }
          ]
        }
      ]
    },
    sections: [
      {
        properties: {},
        children: [
          titleP,
          ...(subtitleP ? [subtitleP] : []),
          ...bodyParas,
          disclaimerP
        ]
      }
    ]
  });

  return Packer.toBuffer(docx);
}
