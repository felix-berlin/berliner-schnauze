import { computed, action, map, deepMap } from "nanostores";
import { persistentAtom } from "@nanostores/persistent";
import Fuse from "fuse.js";
import type { BerlinerWord } from "@ts_types/generated";

interface WordGroups {
  letterGroups: string[];
  activeLetterFilter: string;
  wordList: BerlinerWord[];
  search: string;
}

export const $wordSearch = map<WordGroups>({
  letterGroups: [],
  activeLetterFilter: "",
  wordList: [],
  search: "",
});

export const setLetterFilter = action($wordSearch, "setLetterFilter", (store, letter: string) => {
  store.setKey("activeLetterFilter", letter);
});

export const setSearch = action($wordSearch, "setSearch", (store, search: string) => {
  store.setKey("search", search);
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
  // Fuse options
  const options = {
    keys: ["wordProperties.berlinerisch", "wordProperties.translation"],
  };

  // Init Fuse
  const fuse = new Fuse(wordSearch.wordList, options);

  // Start Fuse search
  const results = fuse.search(wordSearch.search);

  /**
   * Fuse adds a score to each result, which we don't need.
   *
   * @param   {Array}  result  [result description]
   *
   * @return  {BerlinerWord[]}          [return description]
   */
  const cleanResults = results.map((result): BerlinerWord[] => {
    return result.item;
  });

  // If there are no results or the search is empty, return the full word list
  if (cleanResults.length === 0 || wordSearch.search === "") {
    return wordSearch.wordList;
  }

  return cleanResults;
});
