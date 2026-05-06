import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer
} from "@react-pdf/renderer";
import * as React from "react";
import type { DocumentRender, DocumentBlock } from "@/lib/templates/types";
import { TRIAGE_DISCLAIMER } from "@/lib/anthropic/prompts";

const styles = StyleSheet.create({
  page: { padding: 50, fontSize: 11, fontFamily: "Times-Roman", color: "#111", lineHeight: 1.45 },
  title: { fontSize: 14, fontFamily: "Times-Bold", textAlign: "center", marginBottom: 4, textTransform: "uppercase" },
  subtitle: { fontSize: 10, fontFamily: "Times-Italic", textAlign: "center", color: "#444", marginBottom: 18 },
  h2: { fontSize: 12, fontFamily: "Times-Bold", marginTop: 8, marginBottom: 4 },
  h3: { fontSize: 11, fontFamily: "Times-Bold", marginTop: 6, marginBottom: 3 },
  paragraph: { marginBottom: 8, textAlign: "justify" },
  listItem: { marginLeft: 14, marginBottom: 4 },
  addressLeft: { marginBottom: 6 },
  addressRight: { marginBottom: 6, textAlign: "right" },
  signatureBlock: { marginTop: 12 },
  spacerSm: { height: 6 },
  spacerMd: { height: 14 },
  spacerLg: { height: 28 },
  disclaimer: {
    marginTop: 20,
    padding: 8,
    backgroundColor: "#fff8e1",
    borderColor: "#f0c36d",
    borderWidth: 1,
    borderRadius: 3,
    fontSize: 8,
    fontFamily: "Times-Italic",
    lineHeight: 1.4
  },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 50,
    right: 50,
    fontSize: 8,
    color: "#999",
    flexDirection: "row",
    justifyContent: "space-between"
  }
});

function renderBlock(b: DocumentBlock, key: number) {
  switch (b.type) {
    case "heading":
      return (
        <Text key={key} style={b.level === 3 ? styles.h3 : styles.h2}>
          {b.text}
        </Text>
      );
    case "paragraph":
      return (
        <Text key={key} style={styles.paragraph}>
          {b.text}
        </Text>
      );
    case "numbered_list":
      return (
        <View key={key}>
          {b.items.map((it, i) => (
            <Text key={i} style={[styles.paragraph, styles.listItem]}>
              {i + 1}. {it}
            </Text>
          ))}
        </View>
      );
    case "bullet_list":
      return (
        <View key={key}>
          {b.items.map((it, i) => (
            <Text key={i} style={[styles.paragraph, styles.listItem]}>
              • {it}
            </Text>
          ))}
        </View>
      );
    case "address_block": {
      const style = b.align === "right" ? styles.addressRight : styles.addressLeft;
      return (
        <View key={key} style={style}>
          {b.lines.map((l, i) => (
            <Text key={i}>{l}</Text>
          ))}
        </View>
      );
    }
    case "signature_block":
      return (
        <View key={key} style={styles.signatureBlock}>
          {b.lines.map((l, i) => (
            <Text key={i}>{l}</Text>
          ))}
        </View>
      );
    case "spacer":
      return (
        <View
          key={key}
          style={b.size === "lg" ? styles.spacerLg : b.size === "md" ? styles.spacerMd : styles.spacerSm}
        />
      );
  }
}

interface Props {
  doc: DocumentRender;
}

function DocumentBody({ doc }: Props) {
  return (
    <Document title={doc.title} author="LegalDesk AI" subject={doc.meta.sku}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{doc.title}</Text>
        {doc.subtitle ? <Text style={styles.subtitle}>{doc.subtitle}</Text> : null}
        {doc.blocks.map((b, i) => renderBlock(b, i))}
        <Text style={styles.disclaimer}>{TRIAGE_DISCLAIMER}</Text>
        <View style={styles.footer} fixed>
          <Text>Ref {doc.meta.reference}</Text>
          <Text>legaldesk.ai</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderDocumentPdf(doc: DocumentRender): Promise<Buffer> {
  return renderToBuffer(<DocumentBody doc={doc} />);
}
