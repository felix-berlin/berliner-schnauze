import type { Orama, SearchParamsFullText } from "@orama/orama";

import { computedAsync } from "@nanostores/async";
import { persistentMap } from "@nanostores/persistent";
import { create, insertMultiple, search } from "@orama/orama";
import { language, stemmer } from "@orama/stemmers/german";
import { fetchSearchIndex } from "@services/searchIndex.ts";
import { trackEvent } from "@utils/analytics";
import { useViewTransition } from "@utils/helpers.ts";
import { jsonCodec } from "@utils/jsonCodec";
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
  activeOrderCategory: "alphabetical" | "date" | "modifiedDate";
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
  activeOrderCategory: "alphabetical",
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

export const $wordSearch = persistentMap<WordList>(
  "wordSearch:",
  structuredClone(FILTER_DEFAULTS),
  jsonCodec,
);

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

/**
 * Set the active letter to filter the word list
 *
 * @param   {string}  letter           [letter DESCription]
 *
 * @return  {void}                   [return DESCription]
 */
export const setLetterFilter = (letter: string) => {
  useViewTransition(() => $wordSearch.setKey("activeLetterFilter", letter));

  trackEvent("WordList", "Filter", `Letter: ${letter}`);
};

export const $setSortOrder = (
  category: WordList["activeOrderCategory"],
  orderName: string,
  order: "ASC" | "DESC",
) => {
  $wordSearch.setKey("activeOrderCategory", category);
  $wordSearch.setKey(orderName as keyof WordList, order);

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

const SORT_BY = {
  alphabetical: { orderKey: "alphabeticalOrder", property: "wordProperties.berlinerisch" },
  date: { orderKey: "dateOrder", property: "dateTs" },
  modifiedDate: { orderKey: "modifiedDateOrder", property: "modifiedTs" },
} as const;

function getSortBy(wordSearch: WordList) {
  const { orderKey, property } = SORT_BY[wordSearch.activeOrderCategory] ?? SORT_BY.alphabetical;
  return { order: wordSearch[orderKey], property };
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
      const sortBy = getSortBy(wordSearch);

      const params: SearchParamsFullText<Orama<typeof wordSchema>> = {
        boost: {
          wordComponents: 1.0,
          "wordProperties.berlinerisch": 2.5,
          "wordProperties.translations": 1,
        },
        limit,
        // Only the user-facing text fields.
        properties: [
          "wordComponents",
          "wordProperties.berlinerisch",
          "wordProperties.translations",
        ],
        sortBy,
        term: searchQuery,
        threshold: 0.5,
        tolerance: 1,
        ...(Object.keys(where).length > 0 ? { where } : {}),
      };

      return db ? await search(db, params) : null;
    } catch (err) {
      console.error("[wordList] Search failed:", err);
      return null;
    }
  },
);

export const $searchResultCount = computed($oramaSearchResults, (oramaSearchResults) => {
  if (oramaSearchResults.state !== "ready") return 0;
  return oramaSearchResults.value?.count ?? 0;
});

export const $searchState = computed(
  $oramaSearchResults,
  (oramaSearchResults) => oramaSearchResults.state, // 'loading' | 'ready' | 'failed'
);
