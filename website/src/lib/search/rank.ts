import type { ListRow, RankedHit, SearchEntry, Tier } from "./types";

import { normalize, soundex, terms } from "./query";

/** Fuzzy (sounds-like) hits only show when there are fewer real hits than this. */
export const FUZZY_BELOW = 5;

/** True if every search word is a prefix of a word in the text: "stink fü" covers "stinkende Füße". */
const coversTerm = (text: string, qTerms: string[]) => {
  const parts = terms(text);
  return qTerms.every((t) => parts.some((part) => part.startsWith(t)));
};

/** `q` must be normalized. null = no match. */
export function tierOf(
  entry: SearchEntry,
  q: string,
  qTerms = terms(q),
  qSoundex = soundex(q),
): Tier | null {
  if (!q || !qTerms.length) return null;
  const word = normalize(entry.wordProperties.berlinerisch);
  if (word === q) return 0;
  if (word.startsWith(q)) return 1;
  if (word.includes(q) || coversTerm(word, qTerms)) return 2; // includes: "Splitterbrötchen" for "brötchen"
  const { translations } = entry.wordProperties;
  if (translations.some((t) => normalize(t) === q)) return 3;
  if (translations.some((t) => coversTerm(t, qTerms))) return 4;
  return entry.form.soundex && entry.form.soundex === qSoundex ? 5 : null;
}

/** Stable: tier, then Orama score (by slug) descending. */
export function rankHits(
  entries: SearchEntry[],
  q: string,
  scores = new Map<string, number>(),
): RankedHit[] {
  const nq = normalize(q);
  const qTerms = terms(nq);
  const qSoundex = soundex(nq);
  const hits: RankedHit[] = [];
  for (const entry of entries) {
    const tier = tierOf(entry, nq, qTerms, qSoundex);
    if (tier !== null) hits.push({ entry, tier });
  }
  const score = (h: RankedHit) => scores.get(h.entry.slug) ?? 0;
  hits.sort((a, b) => a.tier - b.tier || score(b) - score(a));
  const real = hits.filter((h) => h.tier < 5);
  return real.length < FUZZY_BELOW ? hits : real;
}

export function withDividers(hits: RankedHit[]): ListRow[] {
  const rows: ListRow[] = [];
  hits.forEach((hit, i) => {
    const prev = hits[i - 1];
    if (hit.tier === 5 && prev?.tier !== 5) {
      rows.push({ kind: "divider", label: "Klingt ähnlich" });
    } else if ((hit.tier === 3 || hit.tier === 4) && prev && prev.tier < 3) {
      rows.push({ kind: "divider", label: "Ab hier: Treffer in der Bedeutung" });
    }
    rows.push({ hit, kind: "hit" });
  });
  return rows;
}
