import Fuse from "fuse.js";

self.onmessage = (event) => {
  const { wordList, wordSearch } = event.data;
  // console.log("Worker received data", wordSearch);

  let filteredWordList = wordList;
  if (wordSearch.activeLetterFilter || wordSearch.activeWordTypeFilter || wordSearch.berolinismus) {
    filteredWordList = wordList.filter((word) => {
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
  }

  // Combine all sorting into a single function
  filteredWordList.sort((a, b) => {
    let result = 0;

    if (
      wordSearch.activeOrderCategory === "alphabetical" &&
      a?.wordProperties?.berlinerisch &&
      b?.wordProperties?.berlinerisch
    ) {
      result =
        wordSearch.alphabeticalOrder === "asc"
          ? a.wordProperties.berlinerisch.localeCompare(b.wordProperties.berlinerisch)
          : b.wordProperties.berlinerisch.localeCompare(a.wordProperties.berlinerisch);
    }

    if (result === 0 && wordSearch.activeOrderCategory === "date" && a.dateGmt && b.dateGmt) {
      result =
        wordSearch.dateOrder === "asc"
          ? new Date(a.dateGmt).getTime() - new Date(b.dateGmt).getTime()
          : new Date(b.dateGmt).getTime() - new Date(a.dateGmt).getTime();
    }

    if (
      result === 0 &&
      wordSearch.activeOrderCategory === "modifiedDate" &&
      a.modifiedGmt &&
      b.modifiedGmt
    ) {
      result =
        wordSearch.modifiedDateOrder === "asc"
          ? new Date(a.modifiedGmt).getTime() - new Date(b.modifiedGmt).getTime()
          : new Date(b.modifiedGmt).getTime() - new Date(a.modifiedGmt).getTime();
    }

    return result;
  });

  // Only use Fuse.js if a search term is provided
  if (wordSearch.search !== "") {
    const options = {
      keys: [
        "wordProperties.berlinerisch",
        "wordProperties.translations.translation",
        "wordProperties.alternativeWords.alternativeWord",
      ],
    };

    const fuse = new Fuse(filteredWordList, options);
    const results = fuse.search(wordSearch.search);

    filteredWordList = results.map((result) => result.item);
  }

  self.postMessage(filteredWordList);
};
