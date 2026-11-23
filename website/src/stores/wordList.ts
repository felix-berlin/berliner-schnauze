import type { SearchParamsFullText } from "@orama/orama";
import type { WordDb } from "@services/wordSearchDb.ts";

import { computedAsync } from "@nanostores/async";
import { persistentAtom, persistentMap } from "@nanostores/persistent";
import { search } from "@orama/orama";
import { FULL_TEXT, getWordDb } from "@services/wordSearchDb.ts";
import { trackEvent } from "@utils/analytics";
import { jsonCodec } from "@utils/jsonCodec";
import { vt } from "@utils/viewTransition.ts";
import { atom, computed, onMount, task } from "nanostores";

import type { OramaSearchIndex } from "@/pages/api/search/index.json";

export type RangeFilterMinMax = {
  characterLength: { max: number; min: number };
  consonantsCount: { max: number; min: number };
  syllablesCount: { max: number; min: number };
  vowelsCount: { max: number; min: number };
};

export type SortOrder = "ASC" | "DESC";

export type WordList = {
  activeLetterFilter: string;
  /** "relevance" = best hits first while searching, alphabetical without a term. */
  activeOrderCategory: "alphabetical" | "date" | "modifiedDate" | "relevance";
  activeThemenFilter: string[];
  activeWordTypeFilter: string[];
  alphabeticalOrder: SortOrder;
  audioBerlinerisch: boolean;
  audioExamples: boolean;
  berolinismus: boolean;
  characterCount?: number;
  consonantsCount?: number;
  dateOrder: SortOrder;
  modifiedDateOrder: SortOrder;
  multipleMeanings: boolean;
  syllablesCount?: number;
  vowelsCount?: number;
};

const FILTER_DEFAULTS: WordList = {
  activeLetterFilter: "",
  activeOrderCategory: "relevance",
  activeThemenFilter: [],
  activeWordTypeFilter: [],
  alphabeticalOrder: "ASC",
  audioBerlinerisch: false,
  audioExamples: false,
  berolinismus: false,
  characterCount: undefined,
  consonantsCount: undefined,
  dateOrder: "ASC",
  modifiedDateOrder: "ASC",
  multipleMeanings: false,
  syllablesCount: undefined,
  vowelsCount: undefined,
};

/** Boolean filters: `true` → `where["wordProperties.<key>"] = true`. */
const BOOLEAN_FILTERS = [
  "audioBerlinerisch",
  "audioExamples",
  "berolinismus",
  "multipleMeanings",
] as const satisfies readonly (keyof WordList)[];

/** Range filters: store key → Orama `wordProperties.*` property (matched with `gte`). */
const RANGE_FILTERS = {
  characterCount: "characterLength",
  consonantsCount: "consonantsCount",
  syllablesCount: "syllablesCount",
  vowelsCount: "vowelsCount",
} as const satisfies Partial<Record<keyof WordList, keyof RangeFilterMinMax>>;

/** Keys that count towards $activeFilterCount (sort settings do not). */
const COUNTED_FILTERS = [
  "activeLetterFilter",
  "activeThemenFilter",
  "activeWordTypeFilter",
  ...BOOLEAN_FILTERS,
  ...(Object.keys(RANGE_FILTERS) as (keyof typeof RANGE_FILTERS)[]),
] as const;

const SORT_BY = {
  alphabetical: { orderKey: "alphabeticalOrder", property: "wordProperties.berlinerisch" },
  date: { orderKey: "dateOrder", property: "dateTs" },
  modifiedDate: { orderKey: "modifiedDateOrder", property: "modifiedTs" },
} as const;

export const $wordSearch = persistentMap<WordList>(
  "wordSearch:",
  structuredClone(FILTER_DEFAULTS),
  jsonCodec,
);

/** Set once the old default sort has been migrated in this browser. */
const $sortMigrated = persistentAtom<string>("wordSearchSortMigrated", "");

/**
 * Repairs persisted state from older versions once per load, so readers can trust the types:
 * unknown sort values fall back to the defaults; range values, stored as strings by the old
 * slider and as "" by a cleared number input, become numbers or undefined. Once per browser,
 * the old default sort (A - Z, written by every reset) becomes "relevance"; other sorts stay.
 */
function repairPersisted() {
  const state = $wordSearch.get();
  const category = state.activeOrderCategory;
  if (category !== "relevance" && !(category in SORT_BY)) {
    $wordSearch.setKey("activeOrderCategory", FILTER_DEFAULTS.activeOrderCategory);
  }
  for (const { orderKey } of Object.values(SORT_BY)) {
    if (state[orderKey] !== "ASC" && state[orderKey] !== "DESC") {
      $wordSearch.setKey(orderKey, FILTER_DEFAULTS[orderKey]);
    }
  }
  for (const key of Object.keys(RANGE_FILTERS) as (keyof typeof RANGE_FILTERS)[]) {
    const value: unknown = state[key];
    const min = value === "" || value == null ? undefined : Number(value);
    const fixed = Number.isNaN(min) ? undefined : min;
    if (fixed !== value) $wordSearch.setKey(key, fixed);
  }
  if ($sortMigrated.get()) return;
  if (category === "alphabetical" && state.alphabeticalOrder === "ASC") {
    $wordSearch.setKey("activeOrderCategory", "relevance");
  }
  $sortMigrated.set("1");
}
if (typeof window !== "undefined") repairPersisted();

export const $searchQuery = atom<string>("");

export const $activeFilterCount = computed(
  $wordSearch,
  (wordSearch) =>
    COUNTED_FILTERS.filter((key) => {
      const value = wordSearch[key];
      return Array.isArray(value)
        ? value.length > 0
        : value != null && value !== FILTER_DEFAULTS[key];
    }).length,
);

export const resetAll = () => {
  for (const [key, value] of Object.entries(structuredClone(FILTER_DEFAULTS))) {
    $wordSearch.setKey(key as keyof WordList, value);
  }
  $searchQuery.set("");

  trackEvent("WordList", "Reset", "All filters reset");
};

export const $showWordListFilterFlyout = atom<boolean>(false);

export const $toggleWordListFilterFlyout = () => {
  $showWordListFilterFlyout.set(!$showWordListFilterFlyout.get());
};

export const setLetterFilter = (letter: string) => {
  vt(() => $wordSearch.setKey("activeLetterFilter", letter));

  trackEvent("WordList", "Filter", `Letter: ${letter}`);
};

/** `order` is ignored for "relevance", which has none. */
export const $setSortOrder = (category: WordList["activeOrderCategory"], order?: SortOrder) => {
  $wordSearch.setKey("activeOrderCategory", category);
  if (category !== "relevance" && order) $wordSearch.setKey(SORT_BY[category].orderKey, order);

  trackEvent("WordList", "Sort Order", order ? `${category}: ${order}` : category);
};

export type SearchMeta = {
  letterGroups: string[];
  rangeFilterMinMax?: RangeFilterMinMax;
  themen: { name: string; slug: string }[];
  wordTypes: string[];
};

/** Server-derived filter options — not user state, so not persisted. */
export const $searchMeta = atom<SearchMeta>({ letterGroups: [], themen: [], wordTypes: [] });

const getSearchMeta = async () => {
  const response = await fetch("/api/search/meta.json");
  if (!response.ok) {
    throw new Error(`[wordList] search meta fetch failed: ${response.status}`);
  }
  return (await response.json()) as {
    availableWordGroups: string[];
    rangeFilterMinMax: RangeFilterMinMax;
    themen: { name: string; slug: string }[];
    wordTypes: string[];
  };
};

onMount($searchMeta, () => {
  void task(async () => {
    try {
      const { availableWordGroups, rangeFilterMinMax, themen, wordTypes } = await getSearchMeta();
      $searchMeta.set({ letterGroups: availableWordGroups, rangeFilterMinMax, themen, wordTypes });
    } catch (err) {
      console.error("[wordList] Failed to load search meta:", err);
    }
  });
});

function buildWhere(wordSearch: WordList): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  for (const key of BOOLEAN_FILTERS) {
    if (wordSearch[key]) where[`wordProperties.${key}`] = true;
  }
  for (const [key, property] of Object.entries(RANGE_FILTERS)) {
    const value = wordSearch[key as keyof typeof RANGE_FILTERS];
    if (value != null) where[`wordProperties.${property}`] = { gte: value };
  }
  if (wordSearch.activeLetterFilter) {
    where.wordGroup = { eq: wordSearch.activeLetterFilter };
  }
  if (wordSearch.activeWordTypeFilter?.length) {
    where.berlinerischWordTypes = { containsAny: wordSearch.activeWordTypeFilter };
  }
  if (wordSearch.activeThemenFilter?.length) {
    where.themen = { containsAny: wordSearch.activeThemenFilter };
  }
  return where;
}

/** undefined = no Orama sort: searching with "relevance" ranks hits by matchTier, then score. */
function getSortBy(wordSearch: WordList, term: string) {
  const category = wordSearch.activeOrderCategory;
  if (category === "relevance") {
    return term ? undefined : { order: "ASC" as const, property: SORT_BY.alphabetical.property };
  }
  const { orderKey, property } = SORT_BY[category];
  return { order: wordSearch[orderKey], property };
}

const normalize = (text: string) => text.trim().toLocaleLowerCase("de");

const parts = (text: string) =>
  normalize(text)
    .split(/[^\p{L}]+/u)
    .filter(Boolean);

/** True if every search word is a prefix of a word in the text: "stink fü" covers "stinkende Füße". */
const coversTerm = (text: string, termParts: string[]) => {
  const textParts = parts(text);
  return termParts.every((t) => textParts.some((part) => part.startsWith(t)));
};

/**
 * Orama scores fuzzy and stemmed hits ("Nauke", "Pauke", "Fusseln") like the real ones, so:
 * the word itself, then words starting with the term, then words whose parts cover every
 * search word, then entries with such a translation, then the rest; Orama's score decides
 * within a tier. `term` must be normalized.
 *
 * @internal exported for tests
 */
export function matchTier(
  { berlinerisch, translations }: OramaSearchIndex["wordProperties"],
  term: string,
  termParts = parts(term),
) {
  const word = normalize(berlinerisch);
  if (word === term) return 0;
  if (word.startsWith(term)) return 1;
  if (coversTerm(word, termParts)) return 2;
  return translations.some((t) => coversTerm(t, termParts)) ? 3 : 4;
}

export const $oramaSearchResults = computedAsync(
  [$wordSearch, $searchQuery],
  async (wordSearch, searchQuery) => {
    // Fetch/init failures propagate on purpose: computedAsync then reports
    // state "failed" and the error UI can prompt a reload.
    // limit = index size, so every match is returned.
    const { db, size: limit } = await getWordDb();

    try {
      const where = buildWhere(wordSearch);
      const term = normalize(searchQuery);
      const sortBy = getSortBy(wordSearch, term);

      const params: SearchParamsFullText<WordDb> = {
        limit,
        ...(sortBy ? { sortBy } : {}),
        // Full-text params only with a term: on an empty term properties + threshold
        // made Orama drop part of the multi-word entries from filtered lists.
        ...(term ? { ...FULL_TEXT, term } : {}),
        ...(Object.keys(where).length > 0 ? { where } : {}),
      };

      const results = await search(db, params);
      if (!sortBy) {
        // Stable sort keeps Orama's score order within a tier.
        const termParts = parts(term);
        const tiers = new Map(
          results.hits.map((hit) => [hit, matchTier(hit.document.wordProperties, term, termParts)]),
        );
        results.hits.sort((a, b) => tiers.get(a)! - tiers.get(b)!);
      }
      return results;
    } catch (err) {
      // Rethrow: status "failed" shows the reload hint instead of a fake "no results".
      console.error("[wordList] Search failed:", err);
      throw err;
    }
  },
);

/** Retrieve a local dictionary shortlist for the Prompt API to rank against a natural-language query. */
export async function findSemanticCandidates(query: string) {
  const { db } = await getWordDb();
  const where = buildWhere($wordSearch.get());
  const currentResults = $oramaSearchResults.get();
  const normalSearchCandidates =
    normalize($searchQuery.get()) === normalize(query) && currentResults.state === "ready"
      ? (currentResults.value?.hits ?? [])
          .filter((hit) => matchTier(hit.document.wordProperties, normalize(query)) < 4)
          .slice(0, 20)
          .map((hit) => ({
            document: hit.document as unknown as OramaSearchIndex,
            id: hit.id,
            score: hit.score,
          }))
      : [];
  const stopWords = new Set([
    "aber",
    "also",
    "auch",
    "aus",
    "bei",
    "bin",
    "bis",
    "das",
    "dass",
    "dem",
    "den",
    "der",
    "des",
    "die",
    "ein",
    "eine",
    "einem",
    "einen",
    "einer",
    "eines",
    "für",
    "hat",
    "hast",
    "haben",
    "ich",
    "im",
    "in",
    "ist",
    "jemand",
    "mit",
    "man",
    "mich",
    "mir",
    "nach",
    "nicht",
    "oder",
    "sie",
    "sehr",
    "sind",
    "und",
    "uns",
    "viel",
    "viele",
    "vom",
    "von",
    "war",
    "was",
    "wie",
    "wir",
    "zu",
    "zum",
  ]);
  const uniqueTerms = [
    ...parts(query).filter((part) => part.length > 3 && !stopWords.has(part)),
    normalize(query),
  ].filter((term, index, all) => term && all.indexOf(term) === index);
  const combined = new Map<string, { document: OramaSearchIndex; id: string; score: number }>();

  for (const [termIndex, term] of uniqueTerms.entries()) {
    const result = await search(db, {
      ...FULL_TEXT,
      limit: termIndex === 0 ? 30 : 20,
      term,
      tolerance: termIndex === 0 ? FULL_TEXT.tolerance : 0,
      ...(Object.keys(where).length > 0 ? { where } : {}),
    });
    for (const hit of result.hits) {
      const doc = hit.document as unknown as OramaSearchIndex;
      const score = hit.score / (termIndex + 1);
      const previous = combined.get(hit.id);
      if (previous) {
        previous.score += score;
      } else {
        combined.set(hit.id, {
          document: doc,
          id: hit.id,
          score,
        });
      }
    }
  }

  const rankedCandidates = [...combined.values()].toSorted((a, b) => b.score - a.score);
  const seen = new Set<string>();
  return [...normalSearchCandidates, ...rankedCandidates]
    .filter((candidate) => {
      if (seen.has(candidate.id)) return false;
      seen.add(candidate.id);
      return true;
    })
    .slice(0, 50);
}

export const $searchResultCount = computed($oramaSearchResults, (oramaSearchResults) => {
  if (oramaSearchResults.status !== "ready") return 0;
  return oramaSearchResults.value?.count ?? 0;
});

export const $searchState = computed(
  $oramaSearchResults,
  (oramaSearchResults) => oramaSearchResults.status, // 'loading' | 'ready' | 'failed'
);
