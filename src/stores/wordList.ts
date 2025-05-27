import { computed, atom, task } from "nanostores";
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
import type { OramaSearchIndex } from "@/pages/api/search-index.json.ts";

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
  resultLimit?: number;
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
  let count = 0;

  if (wordSearch.activeLetterFilter !== "") {
    count++;
  }

  if (wordSearch.activeWordTypeFilter !== "") {
    count++;
  }

  if (wordSearch.berolinismus) {
    count++;
  }

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

/**
 * ORAMA
 */

const wordSchema = {
  berlinerischWordTypes: "enum[]",
  dateGmt: "string",
  modifiedGmt: "string",
  wordGroup: "string",
  wordProperties: {
    berlinerisch: "string",
    berolinismus: "boolean",
    translations: "string[]",
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
  if (wordSearch.activeLetterFilter) where.wordGroup = wordSearch.activeLetterFilter;
  if (wordSearch.activeWordTypeFilter)
    where.berlinerischWordTypes = wordSearch.activeWordTypeFilter;
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

export const $oramaSearchResults = computed([$wordSearch], (wordSearch) =>
  task<Results<WordDocument> | null>(async () => {
    const response = await fetch("/api/search-index.json");
    const oramaSearchIndex = (await response.json()) as OramaSearchIndex[];

    const resultLimit = oramaSearchIndex.length;

    if (!db) {
      await initOrama(oramaSearchIndex);
    }

    const where = buildWhere(wordSearch);
    const sortBy = getSortBy(wordSearch);

    const params: SearchParams<Orama<typeof wordSchema>> = {
      term: wordSearch.search,
      properties: ["wordProperties.berlinerisch", "wordProperties.translations"],
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
