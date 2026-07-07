import type { Orama, SearchParamsFullText, TypedDocument } from "@orama/orama";

import { computedAsync } from "@nanostores/async";
import { persistentMap } from "@nanostores/persistent";
import { create, insertMultiple, search } from "@orama/orama";
import { language, stemmer } from "@orama/stemmers/german";
import { trackEvent } from "@utils/analytics";
import { useViewTransition } from "@utils/helpers.ts";
import { atom, computed, onMount, task } from "nanostores";

import type { BerlinerWord } from "@/gql/entity-types";
import type { OramaSearchIndex } from "@/pages/api/search/index.json";

export type CleanBerlinerWord = {
  berlinerischWordTypes: BerlinerWord["berlinerischWordTypes"];
  berlinerWordId: BerlinerWord["berlinerWordId"];
  dateGmt: BerlinerWord["dateGmt"];
  id: BerlinerWord["id"];
  modifiedGmt: BerlinerWord["modifiedGmt"];
  slug: BerlinerWord["slug"];
  wordGroup: BerlinerWord["wordGroup"];
  wordProperties: BerlinerWord["wordProperties"];
};

export type RangeFilterMinMax = {
  characterLength: { max: number; min: number };
  consonantsCount: { max: number; min: number };
  syllablesCount: { max: number; min: number };
  vowelsCount: { max: number; min: number };
};

export type WordList = {
  activeLetterFilter: string;
  activeOrderCategory: "alphabetical" | "date" | "modifiedDate";
  activeThemenFilter: string[];
  activeWordTypeFilter: string[];
  alphabeticalOrder: "ASC" | "DESC";
  audioBerlinerisch: boolean;
  audioExamples?: boolean;
  berolinismus: boolean;
  characterCount?: number;
  consonantsCount?: number;
  dateOrder: "ASC" | "DESC";
  letterGroups: string[];
  modifiedDateOrder: "ASC" | "DESC";
  multipleMeanings?: boolean;
  rangeFilterMinMax?: RangeFilterMinMax;
  resultLimit?: number;
  similarSoundingWords?: boolean;
  syllablesCount?: number;
  themen: { name: string; slug: string }[];
  vowelsCount?: number;
  wordTypes: string[];
};

export const $wordSearch = persistentMap<WordList>(
  "wordSearch:",
  {
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
    letterGroups: [],
    modifiedDateOrder: "ASC",
    multipleMeanings: false,
    resultLimit: undefined,
    similarSoundingWords: false,
    syllablesCount: undefined,
    themen: [],
    vowelsCount: undefined,
    wordTypes: [],
  },
  {
    decode(value) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    },
    encode: (value) => JSON.stringify(value),
  },
);

export const $searchQuery = atom<string>("");

export const $activeFilterCount = computed($wordSearch, (wordSearch) => {
  // List all filter keys that should count as "active" if truthy
  const booleanKeys: (keyof WordList)[] = [
    "berolinismus",
    "audioBerlinerisch",
    "audioExamples",
    "multipleMeanings",
    "similarSoundingWords",
  ];
  const numberKeys: (keyof WordList)[] = [
    "characterCount",
    "consonantsCount",
    "vowelsCount",
    "syllablesCount",
  ];

  let count = 0;

  if (wordSearch.activeLetterFilter !== "") count++;
  if (wordSearch.activeWordTypeFilter?.length) count++;
  if (wordSearch.activeThemenFilter?.length) count++;

  count += booleanKeys.filter((key) => !!wordSearch[key]).length;
  count += numberKeys.filter(
    (key) => wordSearch[key] !== undefined && wordSearch[key] !== null,
  ).length;

  return count;
});

export const resetAll = () => {
  $wordSearch.setKey("activeLetterFilter", "");
  $wordSearch.setKey("activeOrderCategory", "alphabetical");
  $wordSearch.setKey("activeThemenFilter", []);
  $wordSearch.setKey("activeWordTypeFilter", []);
  $wordSearch.setKey("alphabeticalOrder", "ASC");
  $wordSearch.setKey("audioBerlinerisch", false);
  $wordSearch.setKey("audioExamples", false);
  $wordSearch.setKey("berolinismus", false);
  $wordSearch.setKey("characterCount", undefined);
  $wordSearch.setKey("consonantsCount", undefined);
  $wordSearch.setKey("dateOrder", "ASC");
  $wordSearch.setKey("modifiedDateOrder", "ASC");
  $wordSearch.setKey("multipleMeanings", false);
  $searchQuery.set("");
  $wordSearch.setKey("similarSoundingWords", false);
  $wordSearch.setKey("syllablesCount", undefined);
  $wordSearch.setKey("vowelsCount", undefined);

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

function toggleInArray<T>(arr: T[], item: T): T[] {
  const index = arr.indexOf(item);
  if (index === -1) {
    // Not in array, add it
    return [...arr, item];
  } else {
    // Already in array, remove it
    return arr.filter((_, i) => i !== index);
  }
}

export const setWordTypeFilter = (wordType: string) => {
  useViewTransition(() =>
    $wordSearch.setKey(
      "activeWordTypeFilter",
      toggleInArray($wordSearch.get().activeWordTypeFilter, wordType),
    ),
  );
};

export const setThemenFilter = (themaSlug: string) => {
  useViewTransition(() =>
    $wordSearch.setKey(
      "activeThemenFilter",
      toggleInArray($wordSearch.get().activeThemenFilter, themaSlug),
    ),
  );
};

export const setActiveOrderCategory = (orderCategory: WordList["activeOrderCategory"]) => {
  $wordSearch.setKey("activeOrderCategory", orderCategory);
};

/**
 * Toggle order by name
 * @return {void}
 */
export const $alphabeticalOrderToggle = (): void => {
  $wordSearch.setKey(
    "alphabeticalOrder",
    $wordSearch.get().alphabeticalOrder === "ASC" ? "DESC" : "ASC",
  );
};

/**
 * Toggle order by date
 * @param {MapStore<WordList>} $wordSearch
 * @return {void}
 */
export const $wordListDateOrderToggle = (): void => {
  $wordSearch.setKey("dateOrder", $wordSearch.get().dateOrder === "ASC" ? "DESC" : "ASC");
};

/**
 * Toggle order by modified date
 * @param {MapStore<WordList>} $wordSearch
 * @return {void}
 */
export const $wordListModifiedDateOrderToggle = (): void => {
  $wordSearch.setKey(
    "modifiedDateOrder",
    $wordSearch.get().modifiedDateOrder === "ASC" ? "DESC" : "ASC",
  );
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

export const setSearch = (search: string) => {
  $searchQuery.set(search);
};

export const $toggleBerolinismus = () => {
  useViewTransition(() => $wordSearch.setKey("berolinismus", !$wordSearch.get().berolinismus));

  trackEvent("WordList", "Filter", `Berolinismus: ${$wordSearch.get().berolinismus}`);
};

export const searchLength = computed($searchQuery, (q) => q.length);

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

onMount($wordSearch, () => {
  void task(async () => {
    try {
      const meta = await getSearchMeta();
      $wordSearch.setKey("letterGroups", meta.availableWordGroups);
      $wordSearch.setKey("wordTypes", meta.wordTypes);
      $wordSearch.setKey("themen", meta.themen);
      $wordSearch.setKey("rangeFilterMinMax", meta.rangeFilterMinMax);
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
  dateGmt: "string",
  dateTs: "number",
  modifiedGmt: "string",
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
    similarSoundingWords: "boolean",
    syllablesCount: "number",
    translations: "string[]",
    vowelsCount: "number",
  },
} as const;

type WordDocument = TypedDocument<Orama<typeof wordSchema>>;

let db: null | Orama<typeof wordSchema> = null;

type SortByType =
  | ((a: [number, number, WordDocument], b: [number, number, WordDocument]) => number)
  | { order: "ASC" | "DESC"; property: string };

function buildWhere(wordSearch: WordList): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (wordSearch.berolinismus) where["wordProperties.berolinismus"] = true;
  if (wordSearch.audioBerlinerisch) where["wordProperties.audioBerlinerisch"] = true;
  if (wordSearch.audioExamples) where["wordProperties.audioExamples"] = true;
  if (wordSearch.multipleMeanings) where["wordProperties.multipleMeanings"] = true;
  if (wordSearch.similarSoundingWords) {
    where["wordProperties.similarSoundingWords"] = true;
  }
  if (wordSearch.characterCount != null) {
    where["wordProperties.characterLength"] = {
      gte: wordSearch.characterCount,
    };
  }
  if (wordSearch.consonantsCount != null) {
    where["wordProperties.consonantsCount"] = {
      gte: wordSearch.consonantsCount,
    };
  }
  if (wordSearch.vowelsCount != null) {
    where["wordProperties.vowelsCount"] = {
      gte: wordSearch.vowelsCount,
    };
  }
  if (wordSearch.syllablesCount != null) {
    where["wordProperties.syllablesCount"] = {
      gte: wordSearch.syllablesCount,
    };
  }
  if (wordSearch.activeLetterFilter) {
    where.wordGroup = { eq: wordSearch.activeLetterFilter };
  }
  if (
    Array.isArray(wordSearch.activeWordTypeFilter) &&
    wordSearch.activeWordTypeFilter.length > 0
  ) {
    where.berlinerischWordTypes = {
      containsAny: wordSearch.activeWordTypeFilter,
    };
  }
  if (
    Array.isArray(wordSearch.activeThemenFilter) &&
    wordSearch.activeThemenFilter.length > 0
  ) {
    where.themen = {
      containsAny: wordSearch.activeThemenFilter,
    };
  }
  return where;
}

function getSortBy(wordSearch: WordList): SortByType {
  if (wordSearch.activeOrderCategory === "date") {
    return (a, b) => {
      return wordSearch.dateOrder === "ASC" ? a[2].dateTs - b[2].dateTs : b[2].dateTs - a[2].dateTs;
    };
  }
  if (wordSearch.activeOrderCategory === "modifiedDate") {
    return (a, b) => {
      return wordSearch.modifiedDateOrder === "ASC"
        ? a[2].modifiedTs - b[2].modifiedTs
        : b[2].modifiedTs - a[2].modifiedTs;
    };
  }
  return {
    order: wordSearch.alphabeticalOrder,
    property: "wordProperties.berlinerisch",
  };
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
          "modifiedGmt",
          "dateTs",
          "dateGmt",
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

let initPromise: null | Promise<OramaSearchIndex[]> = null;

/**
 * Single-flight guard: fetch the search index and build the Orama DB exactly
 * once, even when several computations start before the first one settles
 * (rapid typing on a cold cache would otherwise double-fetch and
 * double-insert documents). Kept lazy — nothing runs until the first search.
 * On failure the memoized promise is cleared so the next computation retries.
 */
function ensureSearchReady(): Promise<OramaSearchIndex[]> {
  initPromise ??= (async () => {
    const response = await fetch("/api/search/index.json");
    if (!response.ok) {
      throw new Error(`[wordList] search index fetch failed: ${response.status}`);
    }
    const searchIndex = (await response.json()) as OramaSearchIndex[];
    await initOrama(searchIndex);
    return searchIndex;
  })().catch((err) => {
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
    const oramaSearchIndex = await ensureSearchReady();
    const resultLimit = oramaSearchIndex.length;

    try {
      const where = buildWhere(wordSearch);
      const sortBy = getSortBy(wordSearch);

      const params: SearchParamsFullText<Orama<typeof wordSchema>> = {
        boost: {
          wordComponents: 1.0,
          "wordProperties.berlinerisch": 2.5,
          "wordProperties.translations": 1,
        },
        limit: wordSearch.resultLimit ?? resultLimit ?? 10,
        // Only the user-facing text fields — "*" would also run full-text
        // matching over dateGmt/modifiedGmt ISO strings.
        properties: ["wordComponents", "wordProperties.berlinerisch", "wordProperties.translations"],
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
