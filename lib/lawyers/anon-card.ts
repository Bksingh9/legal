import type {
  LawyerAnonCard,
  LawyerLanguage,
  Specialization
} from "./types";

interface SourceRow {
  anon_slug: string;
  state: string;
  specializations: string[];
  languages: string[];
  years_exp: number;
  rating: number | string;
}

// BCI Rule 36 firewall. The only path that produces a card visible to
// non-owner non-admin users MUST go through this function. Anything not
// listed below is dropped — no name, email, phone, bar council id,
// payout details, application notes.
export function toAnonCard(row: SourceRow): LawyerAnonCard {
  const specs = row.specializations.filter(isSpec) as Specialization[];
  const langs = row.languages.filter(isLang) as LawyerLanguage[];
  return {
    anon_slug: row.anon_slug,
    state: row.state,
    specializations: specs,
    languages: langs,
    years_exp: row.years_exp,
    rating: typeof row.rating === "number" ? row.rating : Number(row.rating) || 0
  };
}

const SPECS = new Set([
  "criminal", "civil", "family", "property", "consumer",
  "labour", "corporate", "tax", "cyber", "other"
]);
const LANGS = new Set([
  "en", "hi", "ta", "te", "kn", "ml", "mr", "bn", "gu", "pa"
]);

function isSpec(s: string): s is Specialization {
  return SPECS.has(s);
}
function isLang(s: string): s is LawyerLanguage {
  return LANGS.has(s);
}
