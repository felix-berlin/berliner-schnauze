import type { Orama, Results, SearchParams, TypedDocument } from "@orama/orama";

import { persistentMap } from "@nanostores/persistent";
import { create, insertMultiple } from "@orama/orama";
import {
  afterInsert as highlightAfterInsert,
  searchWithHighlight,
} from "@orama/plugin-match-highlight";
import { language, stemmer } from "@orama/stemmers/german";
import { trackEvent } from "@utils/analytics";
import { useViewTransition } from "@utils/helpers.ts";
import { atom, computed, onMount, task } from "nanostores";

import type { BerlinerWord } from "@/gql/graphql";
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
  search: string;
  similarSoundingWords?: boolean;
  syllablesCount?: number;
  vowelsCount?: number;
  wordTypes: string[];
};

export const $wordSearch = persistentMap<WordList>(
  "wordSearch:",
  {
    activeLetterFilter: "",
    activeOrderCategory: "alphabetical",
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
    search: "",
    similarSoundingWords: false,
    syllablesCount: undefined,
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

  count += booleanKeys.filter((key) => !!wordSearch[key]).length;
  count += numberKeys.filter(
    (key) => wordSearch[key] !== undefined && wordSearch[key] !== null,
  ).length;

  return count;
});

export const resetAll = () => {
  $wordSearch.setKey("activeLetterFilter", "");
  $wordSearch.setKey("activeOrderCategory", "alphabetical");
  $wordSearch.setKey("activeWordTypeFilter", []);
  $wordSearch.setKey("alphabeticalOrder", "ASC");
  $wordSearch.setKey("audioBerlinerisch", false);
  $wordSearch.setKey("audioExamples", false);
  $wordSearch.setKey("berolinismus", false);
  $wordSearch.setKey("characterCount", undefined);
  $wordSearch.setKey("consonantsCount", undefined);
  $wordSearch.setKey("dateOrder", "ASC");
  $wordSearch.setKey("letterGroups", []);
  $wordSearch.setKey("modifiedDateOrder", "ASC");
  $wordSearch.setKey("multipleMeanings", false);
  $wordSearch.setKey("search", "");
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

  trackEvent("WordList", "Filter", `Word Type: ${wordType.split(" ").join(", ")}`);
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
  $wordSearch.setKey(orderName, order);

  trackEvent("WordList", "Sort Order", `${category}: ${order}`);
};

export const setSearch = (search: string) => {
  $wordSearch.setKey("search", search);
};

export const $toggleBerolinismus = () => {
  useViewTransition(() => $wordSearch.setKey("berolinismus", !$wordSearch.get().berolinismus));

  trackEvent("WordList", "Filter", `Berolinismus: ${$wordSearch.get().berolinismus}`);
};

export const searchLength = computed($wordSearch, (wordSearch) => {
  return wordSearch?.search ? wordSearch.search.length : 0;
});

const getSearchMeta = async () => {
  const response = await fetch("/api/search/meta.json");
  const meta = (await response.json()) as {
    availableWordGroups: string[];
    rangeFilterMinMax: RangeFilterMinMax;
    wordTypes: string[];
  };
  return meta;
};

onMount($wordSearch, async () => {
  await task(async () => {
    // Fetch search meta data on mount
    await getSearchMeta().then((meta) => {
      $wordSearch.setKey("letterGroups", meta.availableWordGroups);
      $wordSearch.setKey("wordTypes", meta.wordTypes);
      $wordSearch.setKey("rangeFilterMinMax", meta.rangeFilterMinMax);
    });
  });
});

/**
 * ORAMA
 */

const wordSchema = {
  berlinerischWordTypes: "enum[]",
  dateGmt: "string",
  modifiedGmt: "string",
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
  | ((a: [string, number, WordDocument], b: [string, number, WordDocument]) => number)
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
    where.berlinerischWordTypes = { containsAny: wordSearch.activeWordTypeFilter };
  }
  return where;
}

function getSortBy(wordSearch: WordList): SortByType {
  if (wordSearch.activeOrderCategory === "date") {
    return (a, b) => {
      const aDate = new Date(a[2].dateGmt);
      const bDate = new Date(b[2].dateGmt);
      return wordSearch.dateOrder === "ASC"
        ? aDate.getTime() - bDate.getTime()
        : bDate.getTime() - aDate.getTime();
    };
  }
  if (wordSearch.activeOrderCategory === "modifiedDate") {
    return (a, b) => {
      const aDate = new Date(a[2].modifiedGmt);
      const bDate = new Date(b[2].modifiedGmt);
      return wordSearch.modifiedDateOrder === "ASC"
        ? aDate.getTime() - bDate.getTime()
        : bDate.getTime() - aDate.getTime();
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
          "modifiedGmt",
          "dateGmt",
          "wordProperties.berolinismus",
          "berlinerischWordTypes",
        ],
        stemming: true,
      },
    },
    plugins: [
      {
        afterInsert: highlightAfterInsert,
        name: "highlight",
      },
    ],
    schema: wordSchema,
  });

  await insertMultiple(db, words);
}

let searchIndexCache: null | OramaSearchIndex[] = null;

export const $oramaSearchResults = computed([$wordSearch], (wordSearch) =>
  task<null | Results<WordDocument>>(async () => {
    // Only fetch if not cached
    if (!searchIndexCache) {
      const response = await fetch("/api/search/index.json");
      searchIndexCache = (await response.json()) as OramaSearchIndex[];
    }

    const oramaSearchIndex = searchIndexCache;

    const resultLimit = oramaSearchIndex.length;

    if (!db) {
      await initOrama(oramaSearchIndex);
    }

    const where = buildWhere(wordSearch);
    const sortBy = getSortBy(wordSearch);

    const params: SearchParams<Orama<typeof wordSchema>> = {
      limit: wordSearch.resultLimit ?? resultLimit ?? 10,
      properties: "*",
      sortBy,
      term: wordSearch.search,
      threshold: 0.5,
      ...(Object.keys(where).length > 0 ? { where } : {}),
    };

    return db ? await searchWithHighlight(db, params) : null;
  }),
);

export const $searchResultCount = computed($oramaSearchResults, (oramaSearchResults) => {
  return oramaSearchResults?.count ?? 0;
});
