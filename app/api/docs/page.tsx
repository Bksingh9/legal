import Script from "next/script";

export const metadata = {
  title: "API docs — LegalDesk AI",
  description:
    "OpenAPI 3 reference for the LegalDesk public + admin API. Rendered via RapiDoc."
};

// RapiDoc is loaded from a CDN allowlisted in our CSP (unpkg).
// One <Script> + one <rapi-doc> custom element — no npm dep.
export default function ApiDocsPage() {
  return (
    <main className="min-h-dvh">
      <rapi-doc
        spec-url="/api/openapi"
        theme="light"
        render-style="read"
        show-header="false"
        show-info="true"
        allow-server-selection="false"
        allow-authentication="false"
        regular-font="ui-sans-serif, system-ui, Inter, sans-serif"
        primary-color="#234fe0"
        style={{ height: "100vh", width: "100%" }}
      />
      <Script
        type="module"
        src="https://unpkg.com/rapidoc@9.3.4/dist/rapidoc-min.js"
        strategy="afterInteractive"
      />
    </main>
  );
}

// rapi-doc is a custom element; tell TS so JSX accepts it.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "rapi-doc": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & Record<string, unknown>,
        HTMLElement
      >;
    }
  }
}
