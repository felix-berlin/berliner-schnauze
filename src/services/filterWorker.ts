import Fuse from "fuse.js";

declare const self: DedicatedWorkerGlobalScope;

interface Word {
  wordGroup: string;
  berlinerischWordTypes?: { nodes: { name: string }[] };
  wordProperties?: { berolinismus: boolean };
  dateGmt?: string;
  modifiedGmt?: string;
}

interface WordSearch {
  activeLetterFilter: string;
  activeWordTypeFilter: string;
  berolinismus: boolean;
  dateOrder?: string;
  modifiedDateOrder?: string;
  activeOrderCategory?: string;
}

self.onmessage = (event: MessageEvent<{ wordList: Word[]; wordSearch: WordSearch }>) => {
  const { wordList, wordSearch } = event.data;
  console.log("Worker received message");

  let filteredWordList = wordList.filter((word) => {
    let pass = true;

    // Filter by letter
    if (wordSearch.activeLetterFilter !== "") {
      pass = pass && word.wordGroup === wordSearch.activeLetterFilter;
    }

    // Filter by word type
    if (wordSearch.activeWordTypeFilter !== "") {
      pass =
        pass &&
        word.berlinerischWordTypes?.nodes.some(
          (wordType) => wordType.name === wordSearch.activeWordTypeFilter,
        );
    }

    // Filter by Berolinismus
    if (wordSearch.berolinismus) {
      pass = pass && word.wordProperties?.berolinismus === true;
    }

    return pass;
  });

  // Sort by date
  if (wordSearch.activeOrderCategory === "date") {
    filteredWordList.sort((a, b) => {
      if (a.dateGmt && b.dateGmt) {
        return wordSearch.dateOrder === "asc"
          ? new Date(a.dateGmt).getTime() - new Date(b.dateGmt).getTime()
          : new Date(b.dateGmt).getTime() - new Date(a.dateGmt).getTime();
      } else {
        return 0;
      }
    });
  }

  // Sort by modified date
  if (wordSearch.activeOrderCategory === "modifiedDate") {
    filteredWordList.sort((a, b) => {
      if (a.modifiedGmt && b.modifiedGmt) {
        return wordSearch.modifiedDateOrder === "asc"
          ? new Date(a.modifiedGmt).getTime() - new Date(b.modifiedGmt).getTime()
          : new Date(b.modifiedGmt).getTime() - new Date(a.modifiedGmt).getTime();
      } else {
        return 0;
      }
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

  // Fuse adds a score to each result, which we don't need.
  const cleanResults = results.map((result) => {
    return result.item;
  });

  // If there are no results or the search is empty, return the full word list
  if (cleanResults.length === 0 || wordSearch.search === "") {
    self.postMessage(filteredWordList);
  } else {
    self.postMessage(cleanResults);
  }
};
