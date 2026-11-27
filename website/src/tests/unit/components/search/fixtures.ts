import type { SearchResult } from "@lib/search/run";
import type { RankedHit, SearchEntry, Tier } from "@lib/search/types";

import { EMPTY_STATE, type SearchState } from "@lib/search/state";

/** Invented words only (SPEC §17: no production data in tests). */
export const entry = (word: string, patch: Partial<SearchEntry> = {}): SearchEntry =>
  ({
    article: "",
    berlinerischWordTypes: ["Substantiv"],
    dateTs: 0,
    form: { length: word.length, soundex: "", syllables: 2 },
    has: {
      examples: false,
      examplesAudio: false,
      facts: false,
      gap: true,
      images: false,
      stories: false,
    },
    modifiedTs: 0,
    slug: word.toLowerCase(),
    themen: [],
    wordComponents: [],
    wordGroup: word[0]!.toUpperCase(),
    wordProperties: {
      audioBerlinerisch: false,
      audioExamples: false,
      berlinerisch: word,
      berolinismus: false,
      characterLength: word.length,
      consonantsCount: 0,
      multipleMeanings: false,
      syllablesCount: 2,
      translations: [`Bedeutung von ${word}`],
      vowelsCount: 0,
    },
    ...patch,
  }) as SearchEntry;

export const hit = (word: string, tier: Tier = 0, patch: Partial<SearchEntry> = {}): RankedHit => ({
  entry: entry(word, patch),
  tier,
});

export const result = (
  words: string[],
  patch: Partial<SearchResult> = {},
): SearchResult & { rows: SearchResult["rows"] } => ({
  facets: { content: {} as never, letters: { A: 2, Ä: 1 }, total: words.length },
  note: null,
  rows: words.map((w) => ({ hit: hit(w), kind: "hit" as const })),
  suggestions: [],
  total: words.length,
  unfiltered: words.length,
  ...patch,
});

export const state = (patch: Partial<SearchState> = {}): SearchState => ({
  ...EMPTY_STATE,
  ...patch,
});

export const meta = {
  areas: [],
  letters: [
    { count: 2, letter: "A" },
    { count: 1, letter: "Ä" },
    { count: 0, letter: "B" },
  ],
  pos: ["Substantiv", "Verb"],
  themes: [],
  totalWords: 5928,
};
