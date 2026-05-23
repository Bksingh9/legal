// Transport layer for Legal Data Hunter.
//
// THIS IS THE ONE PLACE TO SWAP when the real connector endpoint is known.
// The rest of the integration (client.ts, enrich.ts, the API route) talks to
// the `LegalResearchTransport` interface and never knows how the bytes move.
//
// Today only the MCP connector exists (agent-facing, not reachable from a
// deployed Next.js server). So `getTransport()` returns a working HTTP
// transport IF the env vars are set, otherwise a transport that throws a
// clear "not configured" error. When you have the endpoint, set:
//   LEGAL_RESEARCH_API_URL   e.g. https://legal-data-hunter.internal/mcp
//   LEGAL_RESEARCH_API_KEY   bearer token
// and everything downstream lights up with no other code change.

export interface LegalResearchTransport {
  // `tool` is the connector tool name (e.g. "search", "get_document").
  // `params` is the tool's argument object. Returns the raw JSON payload.
  call<T = unknown>(tool: string, params: Record<string, unknown>): Promise<T>;
}

export class NotConfiguredError extends Error {
  constructor() {
    super(
      "Legal Data Hunter is not configured. Set LEGAL_RESEARCH_API_URL and " +
        "LEGAL_RESEARCH_API_KEY to enable legal research."
    );
    this.name = "NotConfiguredError";
  }
}

class NotConfiguredTransport implements LegalResearchTransport {
  async call<T>(): Promise<T> {
    throw new NotConfiguredError();
  }
}

class HttpLegalResearchTransport implements LegalResearchTransport {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly timeoutMs = 10_000
  ) {}

  async call<T>(tool: string, params: Record<string, unknown>): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      // Convention: POST { tool, params } to the base URL. This is the single
      // assumption about wire format — adjust here once the endpoint is fixed.
      const res = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ tool, params }),
        signal: controller.signal
      });
      if (!res.ok) {
        throw new Error(`legal-research ${tool} failed: HTTP ${res.status}`);
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }
}

export function isLegalResearchConfigured(): boolean {
  return Boolean(process.env.LEGAL_RESEARCH_API_URL && process.env.LEGAL_RESEARCH_API_KEY);
}

let cached: LegalResearchTransport | null = null;

export function getTransport(): LegalResearchTransport {
  if (cached) return cached;
  const url = process.env.LEGAL_RESEARCH_API_URL;
  const key = process.env.LEGAL_RESEARCH_API_KEY;
  cached = url && key ? new HttpLegalResearchTransport(url, key) : new NotConfiguredTransport();
  return cached;
}

// Test seam: inject a fake transport in unit tests.
export function __setTransportForTest(t: LegalResearchTransport | null): void {
  cached = t;
}
