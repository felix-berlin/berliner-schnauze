import { computed, action, map, deepMap } from "nanostores";
import { persistentAtom, persistentMap } from "@nanostores/persistent";
import Fuse from "fuse.js";
import type { Maybe, BerlinerWord } from "@ts_types/generated/graphql";

export type CleanBerlinerWord = Omit<
  BerlinerWord,
  "seo" | "title" | "berlinerWordId" | "dateGmt" | "modifiedGmt"
>;

interface WordGroups {
  letterGroups: Maybe<string>[];
  activeLetterFilter: string;
  wordTypes: Maybe<string>[];
  activeWordTypeFilter: string;
  wordList: CleanBerlinerWord[];
  search: string;
  order: "asc" | "desc";
  berolinismus: boolean;
}

export const $wordSearch = persistentMap<WordGroups>(
  "wordSearch:",
  {
    letterGroups: [],
    activeLetterFilter: "",
    wordTypes: [],
    activeWordTypeFilter: "",
    wordList: [],
    search: "",
    order: "asc",
    berolinismus: false,
  },
  {
    encode: (value) => JSON.stringify(value),
    decode(value) {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    },
  },
);

export const setLetterFilter = action($wordSearch, "setLetterFilter", (store, letter: string) => {
  store.setKey("activeLetterFilter", letter);
});

export const setWordTypeFilter = action(
  $wordSearch,
  "setLetterFilter",
  (store, wordType: string) => {
    store.setKey("activeWordTypeFilter", wordType);
  },
);

export const $wordListOrderToggle = action($wordSearch, "wordListOrderToggle", (store) => {
  store.setKey("order", store.get().order === "asc" ? "desc" : "asc");
});

export const setSearch = action($wordSearch, "setSearch", (store, search: string) => {
  store.setKey("search", search);
});

export const $toggleBerolinismus = action($wordSearch, "toggleBerolinismus", (store) => {
  store.setKey("berolinismus", !store.get().berolinismus);
});

export const searchLength = computed($wordSearch, (wordSearch) => {
  return wordSearch.search.length;
});

/**
 * This computed stores the actual word list, which can be filtered by letter, order and search.
 *
 * @param   {[type]}  $wordSearch  [$wordSearch description]
 * @param   {[type]}  wordSearch   [wordSearch description]
 *
 * @return  {[]}                   [return description]
 */
export const $filteredWordList = computed([$wordSearch], (wordSearch) => {
  let filteredWordList = wordSearch.wordList;

  // Filter by letter
  if (wordSearch.activeLetterFilter !== "") {
    filteredWordList = filteredWordList.filter((word) => {
      return word.wordGroup === wordSearch.activeLetterFilter;
    });
  }

  // Filter by word type
  if (wordSearch.activeWordTypeFilter !== "") {
    filteredWordList = filteredWordList.filter(
      (word) =>
        word.berlinerischWordTypes?.nodes.some(
          (word) => word.name === wordSearch.activeWordTypeFilter,
        ),
    );
  }

  // Sort by order
  if (wordSearch.order) {
    // Reassign the filteredWordList to the sorted list, otherwise the DynamicScroller will not update
    filteredWordList = [
      ...filteredWordList.sort((a, b) => {
        if (a?.wordProperties?.berlinerisch && b?.wordProperties?.berlinerisch) {
          return wordSearch.order === "asc"
            ? a.wordProperties.berlinerisch.localeCompare(b.wordProperties.berlinerisch)
            : b.wordProperties.berlinerisch.localeCompare(a.wordProperties.berlinerisch);
        } else {
          // Default behavior when either is undefined
          return 0;
        }
      }),
    ];
  }

  // Sort by Berolinismus
  if (wordSearch.berolinismus) {
    filteredWordList = filteredWordList.filter((word) => {
      return word.wordProperties?.berolinismus === true;
    });
  }

  // Fuse options
  const options = {
    keys: [
      "wordProperties.berlinerisch",
      "wordProperties.translations.translation",
      "wordProperties.alternativeWords.alternativeWord",
    ],
  };

  // Init Fuse
  const fuse = new Fuse(filteredWordList, options);

  // Start Fuse search
  const results = fuse.search(wordSearch.search);

  /**
   * Fuse adds a score to each result, which we don't need.
   *
   * @param   {Array}  result  [result description]
   *
   * @return  {CleanBerlinerWord[]}          [return description]
   */
  const cleanResults = results.map((result): CleanBerlinerWord => {
    return result.item;
  });

  // If there are no results or the search is empty, return the full word list
  if (cleanResults.length === 0 || wordSearch.search === "") {
    return filteredWordList;
  }

  return cleanResults;
});
