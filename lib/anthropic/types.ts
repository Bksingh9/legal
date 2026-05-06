// Triage domain types. Mirrors the query_classification + urgency
// enums in supabase/migrations/0001_initial_schema.sql.

export const CLASSIFICATIONS = [
  "criminal",
  "civil",
  "family",
  "property",
  "consumer",
  "labour",
  "corporate",
  "tax",
  "cyber",
  "other"
] as const;

export type Classification = (typeof CLASSIFICATIONS)[number];

export const URGENCIES = ["low", "medium", "high", "critical"] as const;
export type Urgency = (typeof URGENCIES)[number];

export const LANGUAGES = ["en", "hi"] as const;
export type Language = (typeof LANGUAGES)[number];

export interface TriageClassification {
  classification: Classification;
  urgency: Urgency;
  confidence: number; // 0..1
  language: Language;
}

export interface CasePrep {
  summary: string;
  framework: {
    // Acts and section numbers only. Never case names — see SPEC.md §1.
    act: string;
    section?: string;
    note?: string;
  }[];
  next_steps: string[];
  documents_to_gather: string[];
  urgency: Urgency;
  language: Language;
}
