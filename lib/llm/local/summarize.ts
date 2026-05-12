// Extractive transcript summariser. Picks the top-N most informative
// sentences from a consultation transcript using TF-IDF-style scoring.
// Faster, smaller, more auditable than a generative LLM — and the lawyer's
// actual words are preserved verbatim rather than rewritten.

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from",
  "had", "has", "have", "he", "her", "his", "i", "if", "in", "is", "it",
  "its", "me", "my", "of", "on", "or", "she", "so", "that", "the", "their",
  "them", "they", "this", "to", "was", "we", "were", "will", "with", "you",
  "your", "do", "does", "did", "not", "no", "yes", "ok", "okay", "um",
  "uh", "like", "just", "really", "very", "would", "could", "should",
  "can", "may", "might", "haan", "nahi", "toh"
]);

export interface ExtractiveSummary {
  facts: string;
  advocate_view: string;
  next_steps: string[];
  documents_to_keep: string[];
  language: "en" | "hi";
}

const HINDI_RX = /[ऀ-ॿ]/;
const SENTENCE_SPLIT = /(?<=[.!?])\s+(?=[A-ZА-Яऀ-ॿ])|(?<=।)\s+/g;

const ACTION_RX =
  /\b(file|send|gather|preserve|note|register|call|approach|book|book a|consult|reply|respond|appeal|move|negotiate|attend|complete|complain|approach|दाखिल|भेज|भेजना|भेजें|एकत्र|इकट्ठा|दर्ज|जवाब|अपील)\b/i;

const DOCUMENT_RX =
  /\b(invoice|receipt|agreement|deed|letter|notice|statement|certificate|id|aadhaar|pan|passport|photo|copy|document|दस्तावेज़|पत्र|प्रमाण-?पत्र|रसीद|चालान)\b/i;

export function extractiveSummary(transcript: string): ExtractiveSummary {
  const cleaned = transcript.replace(/\s+/g, " ").trim();
  if (cleaned.length === 0) {
    return {
      facts: "(transcript not provided)",
      advocate_view: "",
      next_steps: [],
      documents_to_keep: [],
      language: "en"
    };
  }

  const language: "en" | "hi" = HINDI_RX.test(cleaned) ? "hi" : "en";
  const sentences = splitSentences(cleaned);
  if (sentences.length === 0) {
    return {
      facts: cleaned.slice(0, 240),
      advocate_view: "",
      next_steps: [],
      documents_to_keep: [],
      language
    };
  }

  const ranked = rankSentences(sentences);

  // Facts: top 2 sentences excluding ones starting with stop-flag words
  const factCandidates = ranked.filter((r) => !ACTION_RX.test(r.text));
  const facts = factCandidates
    .slice(0, 2)
    .sort((a, b) => a.idx - b.idx)
    .map((r) => r.text)
    .join(" ");

  // Advocate view: longest sentence that looks like an explanation (mid
  // transcript, contains "Section" / "Act" / "court" / "advise")
  const adviceMatches = ranked.filter((r) =>
    /\b(section|act|court|tribunal|liab|grounds?|defence|defense|प्रावधान|अधिनियम|न्यायालय)\b/i.test(
      r.text
    )
  );
  const advocate_view = (adviceMatches[0] ?? ranked[Math.min(2, ranked.length - 1)]).text;

  // Next steps: sentences with action verbs
  const next_steps = ranked
    .filter((r) => ACTION_RX.test(r.text))
    .slice(0, 5)
    .map((r) => r.text);

  // Documents: sentences mentioning document-like nouns
  const documents_to_keep = ranked
    .filter((r) => DOCUMENT_RX.test(r.text))
    .slice(0, 6)
    .map((r) => r.text);

  return {
    facts: facts || sentences[0],
    advocate_view,
    next_steps,
    documents_to_keep,
    language
  };
}

function splitSentences(text: string): string[] {
  return text
    .split(SENTENCE_SPLIT)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8);
}

interface Ranked {
  text: string;
  score: number;
  idx: number;
}

// Simple TF-IDF: score each sentence by sum of term frequencies, weighted
// inversely by how common each term is across all sentences.
function rankSentences(sentences: string[]): Ranked[] {
  const docTokens = sentences.map(tokenize);
  const df = new Map<string, number>();
  for (const toks of docTokens) {
    const seen = new Set(toks);
    for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const total = sentences.length;
  const idf = (term: string) => Math.log((total + 1) / ((df.get(term) ?? 0) + 1)) + 1;

  return sentences
    .map((text, idx) => {
      const tokens = docTokens[idx];
      const tf = new Map<string, number>();
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
      let score = 0;
      for (const [t, count] of tf) score += count * idf(t);
      // Penalise very short sentences (likely fillers)
      if (tokens.length < 5) score *= 0.5;
      return { text, score, idx };
    })
    .sort((a, b) => b.score - a.score);
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-zA-Zऀ-ॿ]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}
