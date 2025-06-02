import { computed, atom, task, onMount } from "nanostores";
import { persistentMap } from "@nanostores/persistent";
import { useViewTransition } from "@utils/helpers.ts";
import type { Maybe, BerlinerWord } from "@/gql/graphql";
import { trackEvent } from "@utils/analytics";
import { create, search, insertMultiple } from "@orama/orama";
import { stemmer, language } from "@orama/stemmers/german";
import {
  afterInsert as highlightAfterInsert,
  searchWithHighlight,
} from "@orama/plugin-match-highlight";
import type { TypedDocument, Orama, Results, SearchParams } from "@orama/orama";
import type { OramaSearchIndex } from "@/pages/api/search/index.json";

export type CleanBerlinerWord = {
  berlinerWordId: BerlinerWord["berlinerWordId"];
  berlinerischWordTypes: BerlinerWord["berlinerischWordTypes"];
  dateGmt: BerlinerWord["dateGmt"];
  id: BerlinerWord["id"];
  modifiedGmt: BerlinerWord["modifiedGmt"];
  slug: BerlinerWord["slug"];
  wordGroup: BerlinerWord["wordGroup"];
  wordProperties: BerlinerWord["wordProperties"];
};

export type RangeFilterMinMax = {
  characterLength: { min: number; max: number };
  consonantsCount: { min: number; max: number };
  vowelsCount: { min: number; max: number };
  syllablesCount: { min: number; max: number };
};

export type WordList = {
  letterGroups: Maybe<string>[];
  activeLetterFilter: string;
  wordTypes: Maybe<string>[];
  activeWordTypeFilter: string;
  search: string;
  alphabeticalOrder: "ASC" | "DESC";
  dateOrder: "ASC" | "DESC";
  modifiedDateOrder: "ASC" | "DESC";
  activeOrderCategory: "alphabetical" | "date" | "modifiedDate";
  berolinismus: boolean;
  audioBerlinerisch: boolean;
  audioExamples?: boolean;
  multipleMeanings?: boolean;
  similarSoundingWords?: boolean;
  characterCount?: number;
  consonantsCount?: number;
  vowelsCount?: number;
  syllablesCount?: number;
  resultLimit?: number;
  rangeFilterMinMax?: RangeFilterMinMax;
};

export const $wordSearch = persistentMap<WordList>(
  "wordSearch:",
  {
    letterGroups: [],
    activeLetterFilter: "",
    wordTypes: [],
    activeWordTypeFilter: "",
    search: "",
    alphabeticalOrder: "ASC",
    dateOrder: "ASC",
    modifiedDateOrder: "ASC",
    activeOrderCategory: "alphabetical",
    berolinismus: false,
    audioBerlinerisch: false,
    audioExamples: false,
    multipleMeanings: false,
    similarSoundingWords: false,
    characterCount: undefined,
    consonantsCount: undefined,
    vowelsCount: undefined,
    syllablesCount: undefined,
    resultLimit: undefined,
  },
  {
    encode: (value) => JSON.stringify(value),
    decode(value) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    },
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
  if (wordSearch.activeWordTypeFilter !== "") count++;

  count += booleanKeys.filter((key) => !!wordSearch[key]).length;
  count += numberKeys.filter(
    (key) => wordSearch[key] !== undefined && wordSearch[key] !== null,
  ).length;

  return count;
});

export const resetAll = () => {
  $wordSearch.setKey("search", "");
  $wordSearch.setKey("activeLetterFilter", "");
  $wordSearch.setKey("activeWordTypeFilter", "");
  $wordSearch.setKey("alphabeticalOrder", "ASC");
  $wordSearch.setKey("dateOrder", "ASC");
  $wordSearch.setKey("modifiedDateOrder", "ASC");
  $wordSearch.setKey("activeOrderCategory", "alphabetical");
  $wordSearch.setKey("berolinismus", false);

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

export const setWordTypeFilter = (wordType: string) => {
  useViewTransition(() => $wordSearch.setKey("activeWordTypeFilter", wordType));

  trackEvent("WordList", "Filter", `Word Type: ${wordType}`);
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
    wordTypes: string[];
    rangeFilterMinMax: RangeFilterMinMax;
  };
  return meta;
};

onMount($wordSearch, async () => {
  await task(async () => {
    // Fetch search meta data on mount
    await getSearchMeta().then((meta) => {
      console.log("hier", meta.rangeFilterMinMax);

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
    berlinerisch: "string",
    berolinismus: "boolean",
    translations: "string[]",
    syllablesCount: "number",
    multipleMeanings: "boolean",
    characterLength: "number",
    audioBerlinerisch: "boolean",
    audioExamples: "boolean",
    consonantsCount: "number",
    vowelsCount: "number",
    similarSoundingWords: "boolean",
  },
} as const;

type WordDocument = TypedDocument<Orama<typeof wordSchema>>;

let db: Orama<typeof wordSchema> | null = null;

async function initOrama(words: OramaSearchIndex[]) {
  db = create({
    schema: wordSchema,
    components: {
      tokenizer: {
        stemming: true,
        stemmerSkipProperties: [
          "wordGroup",
          "modifiedGmt",
          "dateGmt",
          "wordProperties.berolinismus",
          "berlinerischWordTypes",
        ],
        language,
        stemmer,
      },
    },
    plugins: [
      {
        name: "highlight",
        afterInsert: highlightAfterInsert,
      },
    ],
  });

  await insertMultiple(db, words);
}

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
  if (wordSearch.activeWordTypeFilter) {
    where.berlinerischWordTypes = { containsAny: [wordSearch.activeWordTypeFilter] };
  }
  return where;
}

type SortByType =
  | { property: string; order: "ASC" | "DESC" }
  | ((a: [string, number, WordDocument], b: [string, number, WordDocument]) => number);

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
    property: "wordProperties.berlinerisch",
    order: wordSearch.alphabeticalOrder,
  };
}

let searchIndexCache: OramaSearchIndex[] | null = null;

export const $oramaSearchResults = computed([$wordSearch], (wordSearch) =>
  task<Results<WordDocument> | null>(async () => {
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
      term: wordSearch.search,
      properties: "*",
      limit: wordSearch.resultLimit ?? resultLimit ?? 10,
      threshold: 0.5,
      sortBy,
      ...(Object.keys(where).length > 0 ? { where } : {}),
    };

    return db ? await searchWithHighlight(db, params) : null;
  }),
);

export const $searchResultCount = computed($oramaSearchResults, (oramaSearchResults) => {
  return oramaSearchResults?.count ?? 0;
});
