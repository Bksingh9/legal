// Domain types for the Legal Data Hunter integration.
//
// These mirror the connector's tool contract (observed from the live MCP
// server: search / get_document / resolve_reference / discover_sources /
// discover_countries / get_filters). The transport that actually reaches
// the connector is abstracted in ./transport so the wire format can be
// finalised in one place once we have an HTTP endpoint + key.

export const NAMESPACES = ["case_law", "legislation", "doctrine"] as const;
export type Namespace = (typeof NAMESPACES)[number];

export interface SearchHit {
  source: string; // e.g. "IN/IndiaCode"
  source_id: string;
  score: number;
  country: string;
  court: string | null;
  court_tier: number | null;
  date: string | null;
  language: string | null;
  title: string;
  snippet: string;
  url: string | null;
}

export interface SearchResult {
  query: string;
  hits: SearchHit[];
  total_hits: number;
  elapsed_ms: number;
}

export interface SearchParams {
  query: string;
  namespace: Namespace;
  country?: string[];
  top_k?: number;
  source_id?: string;
  court_tier?: number;
  language?: string;
  // 0 = pure keyword, 1 = pure semantic. Omit to use the connector default.
  alpha?: number;
}

export interface LegalDocument {
  source: string;
  source_id: string;
  title: string;
  text: string;
  url: string | null;
  date: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  country: string;
  language: string | null;
  data_type: Namespace | null;
  full_text_size: number;
  text_truncated: boolean;
  // Present on resolve_reference / richer fetches; shape varies by source.
  meta?: Record<string, unknown>;
}

export interface ResolvedReference {
  resolved: boolean;
  match_type: "exact" | "fuzzy" | "none" | string;
  documents: LegalDocument[];
  elapsed_ms: number;
}

export interface SourceInfo {
  source_id: string;
  data_types: Namespace[];
  court_name: string | null;
  tier: number | null;
  document_count: number;
  date_range: { min_year: number; max_year: number } | null;
  notes: string | null;
}

// A Case Prep framework entry after legislation grounding. `verified` is true
// only when the cited Act was confidently matched in IndiaCode; the title /
// url / id fields are present only then. See lib/legal-research/enrich.ts.
export interface GroundedFrameworkEntry {
  act: string;
  section?: string;
  note?: string;
  verified: boolean;
  official_title?: string;
  source_url?: string;
  india_code_id?: string;
}
