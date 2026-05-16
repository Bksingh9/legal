import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LegalDesk AI",
    short_name: "LegalDesk",
    description:
      "AI-powered legal help for India — triage, documents, and lawyer calls.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#234fe0",
    lang: "en-IN",
    orientation: "portrait",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png"
      }
    ]
  };
}
