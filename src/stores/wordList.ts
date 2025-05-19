import { computed, atom, onSet, onStop, task, onMount } from "nanostores";
import { persistentMap } from "@nanostores/persistent";
import { useViewTransition } from "@utils/helpers.ts";
import type { Maybe, BerlinerWord } from "@/gql/graphql";
import filterWorker from "../services/filterWorker?worker";
import { trackEvent } from "@utils/analytics";
import { create, search, insertMultiple } from "@orama/orama";
import { stemmer, language } from "@orama/stemmers/german";
import {
  afterInsert as highlightAfterInsert,
  searchWithHighlight,
} from "@orama/plugin-match-highlight";
import type { TypedDocument, Orama, Results, SearchParams } from "@orama/orama";

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
  wordList: CleanBerlinerWord[];
  search: string;
  alphabeticalOrder: "ASC" | "DESC";
  dateOrder: "ASC" | "DESC";
  modifiedDateOrder: "ASC" | "DESC";
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
    alphabeticalOrder: "ASC",
    dateOrder: "ASC",
    modifiedDateOrder: "ASC",
    activeOrderCategory: "alphabetical",
    berolinismus: false,
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

// Atom to store the filtered word list
export const $filteredWordList = atom<CleanBerlinerWord[]>([]);

let filterWorkerInstance: Worker | undefined;
let lastPostedWordSearch: WordList | undefined;
let isWorkerBusy = false;

export const updateFilteredWordList = (wordSearch: WordList) => {
  const keys = Object.keys(wordSearch);
  if (keys.length < 11) {
    return;
  }

  // If a worker is already busy or the wordSearch is the same as the last one, don't create a new worker
  if (isWorkerBusy || wordSearch === lastPostedWordSearch) {
    return;
  }

  // If a worker already exists, terminate it before creating a new one
  if (filterWorkerInstance) {
    filterWorkerInstance.terminate();
    filterWorkerInstance = undefined;
  }

  if (typeof Worker !== "undefined") {
    filterWorkerInstance = new filterWorker();

    filterWorkerInstance.onmessage = (event: MessageEvent<CleanBerlinerWord[]>) => {
      // if (event.data[0] === "orama") {
      //   console.log("WordSearchWorker", event.data[1]);

      //   return;
      // }
      $filteredWordList.set(event.data);
      isWorkerBusy = false; // Worker is no longer busy after sending a message
    };
  }

  filterWorkerInstance?.postMessage(wordSearch);
  isWorkerBusy = true; // Worker is busy after receiving a message

  lastPostedWordSearch = wordSearch;
};

/**
 * ORAMA
 */

const wordSchema = {
  berlinerischWordTypes: "string[]",
  dateGmt: "string",
  modifiedGmt: "string",
  wordGroup: "string",
  wordProperties: {
    berlinerisch: "string",
    berolinismus: "boolean",
    translations: "string[]",
    examples: "string[]",
  },
} as const;

type WordDocument = TypedDocument<Orama<typeof wordSchema>>;

let db: Orama<typeof wordSchema> | null = null;

async function initOrama(words: CleanBerlinerWord[]) {
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
  // Transform CleanBerlinerWord to Orama document
  const testData = words.map((word) => {
    const examples = Array.isArray(word.wordProperties?.examples)
      ? word.wordProperties.examples
          .map((e: any) => e.example)
          .filter((ex: any) => typeof ex === "string")
      : [];
    const translations = Array.isArray(word.wordProperties?.translations)
      ? word.wordProperties.translations
          .map((t: any) => t.translation)
          .filter((tr: any) => typeof tr === "string")
      : [];
    const berlinerischWordTypes =
      word.wordProperties.berlinerischWordTypes?.map((type: any) => type.name) ?? [];
    return {
      berlinerischWordTypes,
      dateGmt: word.dateGmt,
      modifiedGmt: word.modifiedGmt,
      wordGroup: word.wordGroup,
      wordProperties: {
        berlinerisch: word.wordProperties?.berlinerisch,
        berolinismus: word.wordProperties?.berolinismus,
        translations,
        examples,
      },
    };
  });
  await insertMultiple(db, testData);
}

export const $oramaSearchResults = computed([$wordSearch], (wordSearch) =>
  task(async () => {
    if (!db) {
      await initOrama(wordSearch.wordList);
    }
    // Optionally re-init if wordList changes
    // await initOrama(wordSearch.wordList);

    const where: any = {};
    if (wordSearch.berolinismus) where["wordProperties.berolinismus"] = true;
    if (wordSearch.activeLetterFilter) where.wordGroup = wordSearch.activeLetterFilter;
    if (wordSearch.activeWordTypeFilter)
      where.berlinerischWordTypes = wordSearch.activeWordTypeFilter;

    let sortBy: any = {
      property: "wordProperties.berlinerisch",
      order: wordSearch.alphabeticalOrder,
    };
    if (wordSearch.activeOrderCategory === "date") {
      sortBy = (a: any, b: any) => {
        const aDate = new Date(a[2].dateGmt);
        const bDate = new Date(b[2].dateGmt);
        return wordSearch.dateOrder === "ASC" ? aDate - bDate : bDate - aDate;
      };
    } else if (wordSearch.activeOrderCategory === "modifiedDate") {
      sortBy = (a: any, b: any) => {
        const aDate = new Date(a[2].modifiedGmt);
        const bDate = new Date(b[2].modifiedGmt);
        return wordSearch.modifiedDateOrder === "ASC" ? aDate - bDate : bDate - aDate;
      };
    }

    const params: SearchParams<Orama<typeof wordSchema>> = {
      term: wordSearch.search,
      properties: [
        "wordProperties.berlinerisch",
        "wordProperties.translations",
        "wordProperties.examples",
      ],
      limit: 10,
      sortBy,
      ...(Object.keys(where).length > 0 ? { where } : {}),
    };

    return db ? await searchWithHighlight(db, params) : null;
  }),
);

onSet($wordSearch, ({ newValue, abort }) => {
  // console.log("WordSearch", newValue);

  updateFilteredWordList(newValue);
});

onStop($wordSearch, () => {
  if (!(filterWorkerInstance && isWorkerBusy)) {
    return;
  }
  filterWorkerInstance.terminate();
  filterWorkerInstance = undefined;
  isWorkerBusy = false;
});

export const $searchResultCount = computed($filteredWordList, (filteredWordList) => {
  return filteredWordList?.length ? filteredWordList.length : 0;
});
