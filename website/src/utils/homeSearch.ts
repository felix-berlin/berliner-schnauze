/** Start page search rules (docs/design/startseite-v20/SPEC.md §8). */
export const MIN_QUERY = 2;
export const MAX_HITS = 6;

/** The part of a search index entry the start page reads (an OramaSearchIndex entry fits). */
type HitDoc = { slug: string; wordProperties: { berlinerisch: string; translations: string[] } };

export type HomeHit = { lemma: string; meaning: string; slug: string };
export type TextPart = { mark: boolean; text: string };

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const contains = (text: string, q: string) =>
  text.toLocaleLowerCase("de").includes(q.toLocaleLowerCase("de"));

/** Split `text` into parts, marking every case-insensitive occurrence of the query. */
export function highlight(text: string, query: string): TextPart[] {
  const q = query.trim();
  if (!q) return [{ mark: false, text }];
  // The capture group keeps the matches: odd indices are the hits.
  return text
    .split(new RegExp(`(${escapeRegExp(q)})`, "iu"))
    .map((part, i) => ({ mark: i % 2 === 1, text: part }))
    .filter((part) => part.text);
}

/**
 * The first MAX_HITS docs (Orama's order), split into "Berlinerisch" (lemma hits, also fuzzy ones
 * without a literal match) and "Gefunden über Hochdeutsch" (only a meaning contains the query,
 * shown as the meaning).
 */
export function groupHits(docs: HitDoc[], query: string) {
  const q = query.trim();
  const lemma: HomeHit[] = [];
  const meaning: HomeHit[] = [];
  for (const { slug, wordProperties } of docs.slice(0, MAX_HITS)) {
    const { berlinerisch, translations } = wordProperties;
    const found = contains(berlinerisch, q) ? undefined : translations.find((t) => contains(t, q));
    if (found) meaning.push({ lemma: berlinerisch, meaning: found, slug });
    else lemma.push({ lemma: berlinerisch, meaning: translations[0] ?? "", slug });
  }
  return { lemma, meaning };
}

export const searchUrl = (query: string) => `/suche?q=${encodeURIComponent(query.trim())}`;

// shortcut: /wort-vorschlagen does not read ?wort= yet, so the word is not prefilled; add the prefill there or drop the param.
export const suggestUrl = (query: string) =>
  `/wort-vorschlagen?wort=${encodeURIComponent(query.trim())}`;

/** Full page load, like the word list's word links. */
export const navigate = (url: string) => {
  window.location.href = url;
};
