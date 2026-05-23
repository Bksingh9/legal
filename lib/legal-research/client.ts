import { getTransport, isLegalResearchConfigured } from "./transport";
import type {
  SearchParams,
  SearchResult,
  LegalDocument,
  ResolvedReference,
  SourceInfo,
  Namespace
} from "./types";

// Typed wrapper over the transport. Mirrors the connector tools 1:1 with
// names and shapes the rest of the app can depend on.
export class LegalResearchClient {
  search(params: SearchParams): Promise<SearchResult> {
    return getTransport().call<SearchResult>("search", {
      query: params.query,
      namespace: params.namespace,
      country: params.country,
      top_k: params.top_k ?? 5,
      source_id: params.source_id,
      court_tier: params.court_tier,
      language: params.language,
      alpha: params.alpha
    });
  }

  getDocument(args: {
    source: string;
    source_id: string;
    includeFullText?: boolean;
  }): Promise<LegalDocument> {
    return getTransport().call<LegalDocument>("get_document", {
      source: args.source,
      source_id: args.source_id,
      include_full_text: args.includeFullText ?? false
    });
  }

  resolveReference(args: {
    reference: string;
    hintCountry?: string;
    hintType?: Namespace;
  }): Promise<ResolvedReference> {
    return getTransport().call<ResolvedReference>("resolve_reference", {
      reference: args.reference,
      hint_country: args.hintCountry,
      hint_type: args.hintType
    });
  }

  async discoverSources(countryCode: string): Promise<SourceInfo[]> {
    const out = await getTransport().call<{ sources: SourceInfo[] }>("discover_sources", {
      country_code: countryCode
    });
    return out.sources ?? [];
  }
}

let client: LegalResearchClient | null = null;

export function getLegalResearch(): LegalResearchClient {
  if (!client) client = new LegalResearchClient();
  return client;
}

export { isLegalResearchConfigured };
