// Static IndiaCode verification map.
//
// Why this exists: the Legal Data Hunter connector is agent-facing and not
// reachable from a deployed Next.js server, and many core Indian Acts are
// absent from its corpus anyway (see enrich.ts). So the primary source of
// truth for the "verified · IndiaCode" badge is this curated table of the
// central Acts the triage Case Prep actually cites. Every source_url here was
// sourced from the official portal (indiacode.nic.in) — a canonical
// /handle/123456789/<id> landing page — never guessed. The live connector
// remains a fallback in enrich.ts for Acts not covered here.
//
// To extend: add the Act with its real handle id and a `needles` matcher.

export interface IndiaCodeEntry {
  official_title: string;
  india_code_id: string;
  source_url: string;
  // Match groups: the cited Act matches this entry when ANY group has ALL of
  // its tokens present in the citation. Tokens compare case-insensitively as
  // whole words, with a prefix allowance for tokens >= 4 chars (so "instrument"
  // matches "instruments", "ward" matches "wards"). Short abbreviations (e.g.
  // "bns", "ipc") match exactly, so they never collide with "bnss"/longer codes.
  needles: string[][];
}

export const INDIA_CODE_MAP: IndiaCodeEntry[] = [
  { official_title: "Bharatiya Nyaya Sanhita, 2023", india_code_id: "20062", source_url: "https://www.indiacode.nic.in/handle/123456789/20062", needles: [["bharatiya", "nyaya"], ["bns"]] },
  { official_title: "Indian Penal Code, 1860", india_code_id: "2263", source_url: "https://www.indiacode.nic.in/handle/123456789/2263", needles: [["indian", "penal"], ["ipc"]] },
  { official_title: "Bharatiya Nagarik Suraksha Sanhita, 2023", india_code_id: "20340", source_url: "https://www.indiacode.nic.in/handle/123456789/20340", needles: [["bharatiya", "nagarik"], ["bnss"]] },
  { official_title: "Code of Criminal Procedure, 1973", india_code_id: "15247", source_url: "https://www.indiacode.nic.in/handle/123456789/15247", needles: [["criminal", "procedure"], ["crpc"]] },
  { official_title: "Bharatiya Sakshya Adhiniyam, 2023", india_code_id: "20063", source_url: "https://www.indiacode.nic.in/handle/123456789/20063", needles: [["bharatiya", "sakshya"], ["bsa"]] },
  { official_title: "Indian Evidence Act, 1872", india_code_id: "2188", source_url: "https://www.indiacode.nic.in/handle/123456789/2188", needles: [["indian", "evidence"]] },
  { official_title: "Code of Civil Procedure, 1908", india_code_id: "2191", source_url: "https://www.indiacode.nic.in/handle/123456789/2191", needles: [["civil", "procedure"], ["cpc"]] },
  { official_title: "Indian Contract Act, 1872", india_code_id: "2187", source_url: "https://www.indiacode.nic.in/handle/123456789/2187", needles: [["indian", "contract"], ["contract", "act"]] },
  { official_title: "Specific Relief Act, 1963", india_code_id: "1583", source_url: "https://www.indiacode.nic.in/handle/123456789/1583", needles: [["specific", "relief"]] },
  { official_title: "Limitation Act, 1963", india_code_id: "1565", source_url: "https://www.indiacode.nic.in/handle/123456789/1565", needles: [["limitation"]] },
  { official_title: "Negotiable Instruments Act, 1881", india_code_id: "2189", source_url: "https://www.indiacode.nic.in/handle/123456789/2189", needles: [["negotiable"]] },
  { official_title: "Transfer of Property Act, 1882", india_code_id: "12924", source_url: "https://www.indiacode.nic.in/handle/123456789/12924", needles: [["transfer", "property"]] },
  { official_title: "Registration Act, 1908", india_code_id: "2190", source_url: "https://www.indiacode.nic.in/handle/123456789/2190", needles: [["registration"]] },
  { official_title: "Real Estate (Regulation and Development) Act, 2016", india_code_id: "2158", source_url: "https://www.indiacode.nic.in/handle/123456789/2158", needles: [["real", "estate"], ["rera"]] },
  { official_title: "Consumer Protection Act, 2019", india_code_id: "15256", source_url: "https://www.indiacode.nic.in/handle/123456789/15256", needles: [["consumer", "protection"]] },
  { official_title: "Hindu Marriage Act, 1955", india_code_id: "1560", source_url: "https://www.indiacode.nic.in/handle/123456789/1560", needles: [["hindu", "marriage"]] },
  { official_title: "Special Marriage Act, 1954", india_code_id: "1387", source_url: "https://www.indiacode.nic.in/handle/123456789/1387", needles: [["special", "marriage"]] },
  { official_title: "Hindu Succession Act, 1956", india_code_id: "1713", source_url: "https://www.indiacode.nic.in/handle/123456789/1713", needles: [["hindu", "succession"]] },
  { official_title: "Guardians and Wards Act, 1890", india_code_id: "2318", source_url: "https://www.indiacode.nic.in/handle/123456789/2318", needles: [["guardian", "ward"]] },
  { official_title: "Protection of Women from Domestic Violence Act, 2005", india_code_id: "2021", source_url: "https://www.indiacode.nic.in/handle/123456789/2021", needles: [["domestic", "violence"], ["pwdva"]] },
  { official_title: "Industrial Disputes Act, 1947", india_code_id: "15191", source_url: "https://www.indiacode.nic.in/handle/123456789/15191", needles: [["industrial", "dispute"]] },
  { official_title: "Code on Wages, 2019", india_code_id: "15793", source_url: "https://www.indiacode.nic.in/handle/123456789/15793", needles: [["wages"]] },
  { official_title: "Payment of Gratuity Act, 1972", india_code_id: "1703", source_url: "https://www.indiacode.nic.in/handle/123456789/1703", needles: [["gratuity"]] },
  { official_title: "Employees' Provident Funds and Miscellaneous Provisions Act, 1952", india_code_id: "2152", source_url: "https://www.indiacode.nic.in/handle/123456789/2152", needles: [["provident"]] },
  { official_title: "Companies Act, 2013", india_code_id: "2114", source_url: "https://www.indiacode.nic.in/handle/123456789/2114", needles: [["companies"], ["company"]] },
  { official_title: "Income-tax Act, 1961", india_code_id: "2435", source_url: "https://www.indiacode.nic.in/handle/123456789/2435", needles: [["income", "tax"]] },
  { official_title: "Central Goods and Services Tax Act, 2017", india_code_id: "15689", source_url: "https://www.indiacode.nic.in/handle/123456789/15689", needles: [["goods", "services"], ["gst"], ["cgst"]] },
  { official_title: "Information Technology Act, 2000", india_code_id: "13116", source_url: "https://www.indiacode.nic.in/handle/123456789/13116", needles: [["information", "technology"]] }
];

// Whole-word match with a prefix allowance for longer tokens (so plurals and
// inflections match), exact-only for short abbreviations (so "bns" != "bnss").
function wordsMatch(words: string[], token: string): boolean {
  return words.some((w) => w === token || (token.length >= 4 && w.startsWith(token)));
}

// Resolves a free-text cited Act (as written by the model, e.g. "General civil
// procedure (CPC, 1908)") to a verified IndiaCode entry, or null if none of
// the curated Acts match.
export function lookupIndiaCode(citedAct: string): IndiaCodeEntry | null {
  const words = citedAct
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return null;

  for (const entry of INDIA_CODE_MAP) {
    const hit = entry.needles.some((group) => group.every((t) => wordsMatch(words, t)));
    if (hit) return entry;
  }
  return null;
}
