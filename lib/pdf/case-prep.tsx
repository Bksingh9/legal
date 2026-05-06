import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer
} from "@react-pdf/renderer";
import { TRIAGE_DISCLAIMER } from "@/lib/anthropic/prompts";
import type { CasePrep, Classification } from "@/lib/anthropic/types";
import * as React from "react";

// Hindi/Devanagari glyphs require a font registered with @react-pdf.
// We ship an English-first one-page template now; Devanagari font
// registration will land when the Indic transcription pipeline is
// fully wired in W4.

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#111" },
  heading: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  subheading: { fontSize: 9, color: "#666", marginBottom: 18 },
  section: { marginBottom: 12 },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
    color: "#444"
  },
  body: { lineHeight: 1.45 },
  listItem: { marginLeft: 10, marginBottom: 2 },
  pill: {
    backgroundColor: "#f1f1f1",
    color: "#222",
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 8,
    borderRadius: 3,
    marginRight: 4
  },
  pillRow: { flexDirection: "row", marginBottom: 14 },
  disclaimer: {
    marginTop: 18,
    padding: 10,
    backgroundColor: "#fff8e1",
    borderColor: "#f0c36d",
    borderWidth: 1,
    borderRadius: 3,
    fontSize: 8,
    lineHeight: 1.4
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 7,
    color: "#999",
    flexDirection: "row",
    justifyContent: "space-between"
  }
});

interface Props {
  classification: Classification;
  prep: CasePrep;
  generatedAt: Date;
  queryId?: string;
}

function CasePrepDocument(props: Props) {
  const { prep, classification, generatedAt, queryId } = props;
  return (
    <Document
      title="LegalDesk AI — Case Prep"
      author="LegalDesk AI"
      subject={`Case Prep — ${classification}`}
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.heading}>Case Prep</Text>
        <Text style={styles.subheading}>
          Generated {generatedAt.toUTCString()} · LegalDesk AI
        </Text>

        <View style={styles.pillRow}>
          <Text style={styles.pill}>Classification: {classification}</Text>
          <Text style={styles.pill}>Urgency: {prep.urgency}</Text>
          <Text style={styles.pill}>Language: {prep.language}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text style={styles.body}>{prep.summary}</Text>
        </View>

        {prep.framework.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Likely framework</Text>
            {prep.framework.map((f, i) => (
              <Text key={i} style={[styles.body, styles.listItem]}>
                • {f.act}
                {f.section ? `, Section ${f.section}` : ""}
                {f.note ? ` — ${f.note}` : ""}
              </Text>
            ))}
          </View>
        ) : null}

        {prep.next_steps.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Next steps</Text>
            {prep.next_steps.map((s, i) => (
              <Text key={i} style={[styles.body, styles.listItem]}>
                {i + 1}. {s}
              </Text>
            ))}
          </View>
        ) : null}

        {prep.documents_to_gather.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Documents to gather</Text>
            {prep.documents_to_gather.map((d, i) => (
              <Text key={i} style={[styles.body, styles.listItem]}>
                • {d}
              </Text>
            ))}
          </View>
        ) : null}

        <Text style={styles.disclaimer}>{TRIAGE_DISCLAIMER}</Text>

        <View style={styles.footer} fixed>
          <Text>{queryId ? `Ref ${queryId.slice(0, 8)}` : "Preview"}</Text>
          <Text>legaldesk.ai</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderCasePrepPdf(props: Props): Promise<Buffer> {
  return renderToBuffer(<CasePrepDocument {...props} />);
}
