import type { WordDb } from "@services/wordSearchDb";

import { search } from "@orama/orama";
import { FULL_TEXT } from "@services/wordSearchDb";

import type { SearchState } from "./state";
import type { ListRow, RankedHit, SearchEntry } from "./types";

import { facets } from "./facets";
import { matches } from "./filters";
import { normalize, soundex, terms } from "./query";
import { rankHits, withDividers } from "./rank";
import { sortHits } from "./sort";
import { effectiveSort } from "./state";

export type SearchContext = { trendRanks: Map<string, number>; wotd?: string };
export type SearchResult = {
  rows: ListRow[];
  total: number;
  /** Hits before the filters: 0 with total 0 means the query itself found nothing. */
  unfiltered: number;
  facets: ReturnType<typeof facets>;
  note:
    | "alle in der Bedeutung"
    | "erst im Wort, dann in der Bedeutung"
    | `Treffer in der Bedeutung, enthalten „${string}“`
    | null;
  /** „Meinste“: only when total === 0 and q is set. */
  suggestions: SearchEntry[];
};

const SUGGESTIONS = 3;

function distance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        prev[j]! + 1,
        row[j - 1]! + 1,
        prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = row;
  }
  return prev[b.length]!;
}

/** Same sound or within two edits, closest first. Ignores filters: the user typed something unknown. */
function didYouMean(entries: SearchEntry[], q: string): SearchEntry[] {
  const nq = normalize(q);
  const sx = soundex(nq);
  return entries
    .map((entry) => ({ d: distance(nq, normalize(entry.wordProperties.berlinerisch)), entry }))
    .filter(({ d, entry }) => d <= 2 || (!!sx && entry.form.soundex === sx))
    .sort((a, b) => a.d - b.d)
    .slice(0, SUGGESTIONS)
    .map(({ entry }) => entry);
}

function noteOf(hits: RankedHit[], q: string): SearchResult["note"] {
  const word = hits.some((h) => h.tier < 3);
  const meaning = hits.filter((h) => h.tier === 3 || h.tier === 4);
  if (!meaning.length) return null;
  if (word) return "erst im Wort, dann in der Bedeutung";
  // shortcut: SPEC does not say when "enthalten" applies; used for partial-only meaning hits.
  return meaning.every((h) => h.tier === 4)
    ? `Treffer in der Bedeutung, enthalten „${q}“`
    : "alle in der Bedeutung";
}

function withLetters(hits: RankedHit[]): ListRow[] {
  const counts = new Map<string, number>();
  for (const { entry } of hits) counts.set(entry.wordGroup, (counts.get(entry.wordGroup) ?? 0) + 1);
  const rows: ListRow[] = [];
  let last: string | undefined;
  for (const hit of hits) {
    const letter = hit.entry.wordGroup;
    if (letter !== last) rows.push({ count: counts.get(letter)!, kind: "letter", letter });
    last = letter;
    rows.push({ hit, kind: "hit" });
  }
  return rows;
}

export async function runSearch(
  db: WordDb,
  entries: SearchEntry[],
  s: SearchState,
  ctx: SearchContext,
): Promise<SearchResult> {
  const sort = effectiveSort(s);
  const q = normalize(s.q);

  if (!terms(q).length) {
    const hits = sortHits(
      entries.filter((e) => matches(e, s)).map((entry) => ({ entry, tier: 0 as const })),
      sort,
      ctx,
    );
    return {
      facets: facets(entries, s),
      note: null,
      rows: sort === "az" ? withLetters(hits) : hits.map((hit) => ({ hit, kind: "hit" })),
      suggestions: [],
      total: hits.length,
      unfiltered: entries.length,
    };
  }

  // Orama only supplies scores for tie-breaking; membership comes from the tiers.
  const { hits: found } = await search(db, { ...FULL_TEXT, limit: entries.length, term: q });
  const scores = new Map(
    found.map((h) => [(h.document as unknown as SearchEntry).slug, h.score] as const),
  );
  const ranked = rankHits(entries, q, scores);
  const hits = sortHits(
    ranked.filter((h) => matches(h.entry, s)),
    sort,
    ctx,
  );
  return {
    facets: facets(
      ranked.map((h) => h.entry),
      s,
    ),
    note: noteOf(hits, s.q.trim()),
    rows: sort === "beste" ? withDividers(hits) : hits.map((hit) => ({ hit, kind: "hit" })),
    suggestions: hits.length ? [] : didYouMean(entries, q),
    total: hits.length,
    unfiltered: ranked.length,
  };
}

const STOP_WORDS = new Set(
  "aber also auch aus bei bin bis das dass dem den der des die ein eine einem einen einer eines für hat hast haben ich im in ist jemand mit man mich mir nach nicht oder sie sehr sind und uns viel viele vom von war was wie wir zu zum".split(
    " ",
  ),
);

/** Candidates for the on-device AI: every long non-stop word plus the whole query, earlier terms weigh more. */
export async function semanticCandidates(
  db: WordDb,
  entries: SearchEntry[],
  s: SearchState,
  limit = 40,
): Promise<SearchEntry[]> {
  const q = normalize(s.q);
  const uniqueTerms = [...terms(q).filter((t) => t.length > 3 && !STOP_WORDS.has(t)), q].filter(
    (t, i, all) => t && all.indexOf(t) === i,
  );
  const bySlug = new Map(entries.map((e) => [e.slug, e]));
  const combined = new Map<string, number>();
  const results = await Promise.all(
    uniqueTerms.map((term, i) =>
      Promise.resolve(
        search(db, {
          ...FULL_TEXT,
          limit: entries.length, // filters run after, so no early cut-off
          term,
          tolerance: i === 0 ? FULL_TEXT.tolerance : 0,
        }),
      ),
    ),
  );
  for (const [i, { hits }] of results.entries()) {
    for (const h of hits) {
      const slug = (h.document as unknown as SearchEntry).slug;
      combined.set(slug, (combined.get(slug) ?? 0) + h.score / (i + 1));
    }
  }
  return [...combined]
    .sort((a, b) => b[1] - a[1])
    .flatMap(([slug]) => bySlug.get(slug) ?? [])
    .filter((e) => matches(e, s))
    .slice(0, limit);
}
