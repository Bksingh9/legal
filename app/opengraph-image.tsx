import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "LegalDesk AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(135deg, #0e0e10 0%, #1a3cad 100%)",
          color: "white",
          fontFamily: "system-ui"
        }}
      >
        <div style={{ display: "flex", fontSize: 28, fontWeight: 600, letterSpacing: 1 }}>
          LegalDesk AI
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, maxWidth: 1000 }}>
            AI-powered legal help for India.
          </div>
          <div style={{ fontSize: 28, opacity: 0.85, maxWidth: 1000 }}>
            Triage. Documents. Lawyer calls. BCI-compliant. India-resident data.
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
