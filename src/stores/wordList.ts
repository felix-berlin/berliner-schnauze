import { computed, atom, onSet, onStop } from "nanostores";
import { persistentAtom, persistentMap } from "@nanostores/persistent";
import { useViewTransition } from "@utils/helpers.ts";
import type { Maybe, BerlinerWord } from "@ts_types/generated/graphql";
import filterWorker from "../services/filterWorker?worker";

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

export const $filteredWordList = atom<Word[]>([]);

let filterWorkerInstance;

if (typeof Worker !== "undefined") {
  filterWorkerInstance = new filterWorker();

  filterWorkerInstance.onmessage = function (event: MessageEvent<Word[]>) {
    $filteredWordList.set(event.data);
  };

  filterWorkerInstance.postMessage({
    wordList: $wordSearch.get().wordList,
    wordSearch: $wordSearch.get(),
  });
}

export function updateFilteredWordList(wordList: Word[], wordSearch: WordSearch) {
  if (filterWorkerInstance) {
    filterWorkerInstance.postMessage({ wordList, wordSearch });
  }
}

// updateFilteredWordList($wordSearch.get().wordList, $wordSearch.get().search);
// Update the filtered list whenever $wordSearch changes
onSet($wordSearch, ({ newValue, abort }) => {
  updateFilteredWordList(newValue.wordList, newValue);
});

onStop($wordSearch, () => {
  if (filterWorkerInstance) {
    filterWorkerInstance.terminate();
  }
});

export const $searchResultCount = computed($filteredWordList, (filteredWordList) => {
  return filteredWordList.length;
});
