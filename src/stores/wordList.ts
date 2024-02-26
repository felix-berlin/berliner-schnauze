import { computed, atom } from "nanostores";
import { persistentAtom, persistentMap } from "@nanostores/persistent";
import Fuse from "fuse.js";
import { useViewTransition } from "@utils/helpers.ts";
import type { Maybe, BerlinerWord } from "@ts_types/generated/graphql";

export type CleanBerlinerWord = Omit<BerlinerWord, "seo" | "title">;

export type WordList = {
  letterGroups: Maybe<string>[];
  activeLetterFilter: string;
  wordTypes: Maybe<string>[];
  activeWordTypeFilter: string;
  wordList: CleanBerlinerWord[];
  search: string;
  alphabeticalOrder: "asc" | "desc";
  dateOrder: "asc" | "desc";
  modifiedDateOrder: "asc" | "desc";
  activeOrderCategory: "alphabetical" | "date" | "modifiedDate";
  berolinismus: boolean;
};

export const $wordSearch = persistentMap<WordList>(
  "wordSearch:",
  {
    letterGroups: [],
    activeLetterFilter: "",
    wordTypes: [],
    activeWordTypeFilter: "",
    wordList: [],
    search: "",
    alphabeticalOrder: "asc",
    dateOrder: "asc",
    modifiedDateOrder: "asc",
    activeOrderCategory: "alphabetical",
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
  $wordSearch.setKey("alphabeticalOrder", "asc");
  $wordSearch.setKey("dateOrder", "asc");
  $wordSearch.setKey("modifiedDateOrder", "asc");
  $wordSearch.setKey("activeOrderCategory", "alphabetical");
  $wordSearch.setKey("berolinismus", false);
};

export const $showWordListFilterFlyout = atom<boolean>(false);

export const $toggleWordListFilterFlyout = () => {
  $showWordListFilterFlyout.set(!$showWordListFilterFlyout.get());
};

/**
 * Set the active letter to filter the word list
 *
 * @param   {string}  letter           [letter description]
 *
 * @return  {void}                   [return description]
 */
export const setLetterFilter = (letter: string) => {
  useViewTransition(() => $wordSearch.setKey("activeLetterFilter", letter));
};

export const setWordTypeFilter = (wordType: string) => {
  useViewTransition(() => $wordSearch.setKey("activeWordTypeFilter", wordType));
};

export const setActiveOrderCategory = (orderCategory: WordList["activeOrderCategory"]) => {
  $wordSearch.setKey("activeOrderCategory", orderCategory);
};

/**
 * Toggle order by name
 *
 * @param   {MapStore<WordList>}  $wordSearch
 * @param   {String}  wordListOrderToggle
 * @param   {Function}  store
 *
 * @return  {void}
 */
export const $alphabeticalOrderToggle = (): void => {
  $wordSearch.setKey(
    "alphabeticalOrder",
    $wordSearch.get().alphabeticalOrder === "asc" ? "desc" : "asc",
  );
};

/**
 * Toggle order by date
 *
 * @param   {MapStore<WordList>}  $wordSearch
 * @param   {String}  wordListDateOrderToggle
 * @param   {Function}  store
 *
 * @return  {void}
 */
export const $wordListDateOrderToggle = (): void => {
  $wordSearch.setKey("dateOrder", $wordSearch.get().dateOrder === "asc" ? "desc" : "asc");
};

/**
 * Toggle order by modified date
 *
 * @param   {MapStore<WordList>}  $wordSearch
 * @param   {String}  wordListModifiedDateOrderToggle
 * @param   {Function}  store
 *
 * @return  {void}
 */
export const $wordListModifiedDateOrderToggle = (): void => {
  $wordSearch.setKey(
    "modifiedDateOrder",
    $wordSearch.get().modifiedDateOrder === "asc" ? "desc" : "asc",
  );
};

export const $setSortOrder = (
  category: WordList["activeOrderCategory"],
  orderName: string,
  order: "asc" | "desc",
) => {
  $wordSearch.setKey("activeOrderCategory", category);
  $wordSearch.setKey(orderName, order);
};

export const setSearch = (search: string) => {
  $wordSearch.setKey("search", search);
};

export const $toggleBerolinismus = () => {
  useViewTransition(() => $wordSearch.setKey("berolinismus", !$wordSearch.get().berolinismus));
};

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
    filteredWordList = filteredWordList.filter((word) =>
      word.berlinerischWordTypes?.nodes.some(
        (word) => word.name === wordSearch.activeWordTypeFilter,
      ),
    );
  }

  // Sort by Berolinismus
  if (wordSearch.berolinismus) {
    filteredWordList = filteredWordList.filter((word) => {
      return word.wordProperties?.berolinismus === true;
    });
  }

  // Sort by order
  if (wordSearch.activeOrderCategory === "alphabetical") {
    // Reassign the filteredWordList to the sorted list, otherwise the DynamicScroller will not update
    filteredWordList = [
      ...filteredWordList.sort((a, b) => {
        if (a?.wordProperties?.berlinerisch && b?.wordProperties?.berlinerisch) {
          return wordSearch.alphabeticalOrder === "asc"
            ? a.wordProperties.berlinerisch.localeCompare(b.wordProperties.berlinerisch)
            : b.wordProperties.berlinerisch.localeCompare(a.wordProperties.berlinerisch);
        } else {
          // Default behavior when either is undefined
          return 0;
        }
      }),
    ];
  }

  // Sort by date
  if (wordSearch.activeOrderCategory === "date") {
    filteredWordList = [
      ...filteredWordList.sort((a, b) => {
        if (a?.dateGmt && b?.dateGmt) {
          return wordSearch.dateOrder === "asc"
            ? new Date(a.dateGmt).getTime() - new Date(b.dateGmt).getTime()
            : new Date(b.dateGmt).getTime() - new Date(a.dateGmt).getTime();
        } else {
          // Default behavior when either is undefined
          return 0;
        }
      }),
    ];
  }

  // // Sort by modified date
  if (wordSearch.activeOrderCategory === "modifiedDate") {
    filteredWordList = [
      ...filteredWordList.sort((a, b) => {
        if (a?.modifiedGmt && b?.modifiedGmt) {
          return wordSearch.modifiedDateOrder === "asc"
            ? new Date(a.modifiedGmt).getTime() - new Date(b.modifiedGmt).getTime()
            : new Date(b.modifiedGmt).getTime() - new Date(a.modifiedGmt).getTime();
        } else {
          // Default behavior when either is undefined
          return 0;
        }
      }),
    ];
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

export const $searchResultCount = computed($filteredWordList, (filteredWordList) => {
  return filteredWordList.length;
});
