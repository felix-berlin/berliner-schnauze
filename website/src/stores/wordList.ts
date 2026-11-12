import type { Orama, SearchParamsFullText } from "@orama/orama";

import { computedAsync } from "@nanostores/async";
import { persistentMap } from "@nanostores/persistent";
import { create, insertMultiple, search } from "@orama/orama";
import { language, stemmer } from "@orama/stemmers/german";
import { fetchSearchIndex } from "@services/searchIndex.ts";
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

type SortOrder = "ASC" | "DESC";

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

/** A range filter's minimum, or undefined: older versions stored slider values as strings
 * and a cleared number input as "". */
const rangeMin = (value: unknown) => {
  const min = value === "" || value == null ? Number.NaN : Number(value);
  return Number.isNaN(min) ? undefined : min;
};

export const $wordSearch = persistentMap<WordList>(
  "wordSearch:",
  structuredClone(FILTER_DEFAULTS),
  jsonCodec,
);

const SORT_MIGRATED_KEY = "wordSearchSortMigrated";

/**
 * Repairs persisted state from older versions once per load: unknown sort values fall back to
 * the defaults, range values become numbers or undefined. Once per browser, the old default sort
 * (A - Z, written by every reset) becomes "relevance"; other explicit sorts stay.
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
    const min = rangeMin(state[key]);
    if (min !== state[key]) $wordSearch.setKey(key, min);
  }
  try {
    if (localStorage.getItem(SORT_MIGRATED_KEY)) return;
    if (category === "alphabetical" && state.alphabeticalOrder === "ASC") {
      $wordSearch.setKey("activeOrderCategory", "relevance");
    }
    localStorage.setItem(SORT_MIGRATED_KEY, "1");
  } catch {
    // No storage (private mode): nothing was persisted, so nothing to migrate.
  }
}
if (typeof window !== "undefined") repairPersisted();

export const $searchQuery = atom<string>("");

export const $activeFilterCount = computed(
  $wordSearch,
  (wordSearch) =>
    COUNTED_FILTERS.filter((key) => {
      const value = wordSearch[key];
      if (Array.isArray(value)) return value.length > 0;
      if (key in RANGE_FILTERS) return rangeMin(value) !== undefined;
      return value != null && value !== FILTER_DEFAULTS[key];
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

/**
 * Set the active letter to filter the word list
 *
 * @param letter the letter to filter by
 */
export const setLetterFilter = (letter: string) => {
  vt(() => $wordSearch.setKey("activeLetterFilter", letter));

  trackEvent("WordList", "Filter", `Letter: ${letter}`);
};

export const $setSortOrder = (category: WordList["activeOrderCategory"], order: SortOrder) => {
  $wordSearch.setKey("activeOrderCategory", category);
  if (category !== "relevance") $wordSearch.setKey(SORT_BY[category].orderKey, order);

  trackEvent("WordList", "Sort Order", `${category}: ${order}`);
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

/**
 * ORAMA
 */

const wordSchema = {
  berlinerischWordTypes: "enum[]",
  dateTs: "number",
  modifiedTs: "number",
  themen: "enum[]",
  wordComponents: "string[]",
  wordGroup: "enum",
  wordProperties: {
    audioBerlinerisch: "boolean",
    audioExamples: "boolean",
    berlinerisch: "string",
    berolinismus: "boolean",
    characterLength: "number",
    consonantsCount: "number",
    multipleMeanings: "boolean",
    syllablesCount: "number",
    translations: "string[]",
    vowelsCount: "number",
  },
} as const;

let db: null | Orama<typeof wordSchema> = null;

function buildWhere(wordSearch: WordList): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  for (const key of BOOLEAN_FILTERS) {
    if (wordSearch[key]) where[`wordProperties.${key}`] = true;
  }
  for (const [key, property] of Object.entries(RANGE_FILTERS)) {
    const min = rangeMin(wordSearch[key as keyof typeof RANGE_FILTERS]);
    if (min !== undefined) where[`wordProperties.${property}`] = { gte: min };
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
  if (category === "relevance" && term) return undefined;
  const { orderKey, property } = SORT_BY[category as keyof typeof SORT_BY] ?? SORT_BY.alphabetical;
  return { order: category === "relevance" ? "ASC" : wordSearch[orderKey], property };
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
) {
  const word = normalize(berlinerisch);
  if (word === term) return 0;
  if (word.startsWith(term)) return 1;
  const termParts = parts(term);
  if (coversTerm(word, termParts)) return 2;
  return translations.some((t) => coversTerm(t, termParts)) ? 3 : 4;
}

async function initOrama(words: OramaSearchIndex[]) {
  db = create({
    components: {
      tokenizer: {
        language,
        stemmer,
        stemmerSkipProperties: [
          "wordGroup",
          "modifiedTs",
          "dateTs",
          "wordProperties.berolinismus",
          "berlinerischWordTypes",
          "themen",
        ],
        stemming: true,
      },
    },
    schema: wordSchema,
  });

  await insertMultiple(db, words);
}

let initPromise: null | Promise<number> = null;

/**
 * Single-flight guard: build the Orama DB exactly once, even when several
 * computations start before the first one settles (rapid typing on a cold
 * cache would otherwise double-insert documents). Kept lazy — nothing runs
 * until the first search. On failure the memoized promise is cleared so the
 * next computation retries. Resolves to the number of indexed words.
 */
function ensureSearchReady(): Promise<number> {
  initPromise ??= fetchSearchIndex()
    .then(async (searchIndex) => {
      await initOrama(searchIndex);
      return searchIndex.length;
    })
    .catch((err: unknown) => {
      initPromise = null; // allow retry after failure
      throw err;
    });
  return initPromise;
}

export const $oramaSearchResults = computedAsync(
  [$wordSearch, $searchQuery],
  async (wordSearch, searchQuery) => {
    // Fetch/init failures propagate on purpose: computedAsync then reports
    // state "failed" and the error UI can prompt a reload.
    // limit = index size, so every match is returned.
    const limit = await ensureSearchReady();

    try {
      const where = buildWhere(wordSearch);
      const term = normalize(searchQuery);
      const sortBy = getSortBy(wordSearch, term);

      const params: SearchParamsFullText<Orama<typeof wordSchema>> = {
        limit,
        ...(sortBy ? { sortBy } : {}),
        // Full-text params only with a term: on an empty term properties + threshold
        // made Orama drop part of the multi-word entries from filtered lists.
        ...(term
          ? {
              boost: {
                wordComponents: 1.0,
                "wordProperties.berlinerisch": 2.5,
                "wordProperties.translations": 1,
              },
              // Only the user-facing text fields.
              properties: [
                "wordComponents",
                "wordProperties.berlinerisch",
                "wordProperties.translations",
              ],
              term,
              threshold: 0.5,
              tolerance: 1,
            }
          : {}),
        ...(Object.keys(where).length > 0 ? { where } : {}),
      };

      if (!db) return null;
      const results = await search(db, params);
      if (!sortBy) {
        // Stable sort keeps Orama's score order within a tier.
        const tiers = new Map(
          results.hits.map((hit) => [hit, matchTier(hit.document.wordProperties, term)]),
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

export const $searchResultCount = computed($oramaSearchResults, (oramaSearchResults) => {
  if (oramaSearchResults.status !== "ready") return 0;
  return oramaSearchResults.value?.count ?? 0;
});

export const $searchState = computed(
  $oramaSearchResults,
  (oramaSearchResults) => oramaSearchResults.status, // 'loading' | 'ready' | 'failed'
);
