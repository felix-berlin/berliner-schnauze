import type { APIRoute } from "astro";

import { fetchAllWords } from "@services/api.ts";
import { countLetters, getWordType, translateNlpTags } from "@utils/wordHelper.ts";
import german from "hyphenation.de";
import Hypher from "hypher";

const hypher = new Hypher(german);

export const GET: APIRoute = async () => {
  const allWords = await fetchAllWords();

  const availableWordGroups = Array.from(
    new Set(allWords.map(({ node }) => node.wordGroup?.toUpperCase())),
  )
    .filter(Boolean)
    .sort();

  // The manually curated word groups
  // const wordTypesCategories = Array.from(
  //   new Set(
  //     allWords
  //       .map(({ node }) => node.berlinerischWordTypes?.nodes)
  //       .flat()
  //       .map((node) => node?.name),
  //   ),
  // ).sort();

  // The word types are derived from the NLP tags
  const wordTypes: string[] = Array.from(
    new Set(
      allWords
        .flatMap(({ node }) => {
          // Get all type objects for each word
          const typeObj = translateNlpTags(getWordType(node.wordProperties?.berlinerisch || ""));
          // typeObj can be an object or array of objects
          // Normalize to array of objects
          const typeObjs = Array.isArray(typeObj) ? typeObj : [typeObj];
          // Extract all values (arrays of types) from each object, flatten, and return
          return typeObjs.flatMap((obj) =>
            obj && typeof obj === "object" ? Object.values(obj).flat() : [],
          );
        })
        .filter(Boolean),
    ),
  ).sort();

  // Gather all relevant counts/lengths
  const characterLengths: number[] = [];
  const consonantsCounts: number[] = [];
  const vowelsCounts: number[] = [];
  const syllablesCounts: number[] = [];

  for (const { node } of allWords) {
    const berlinerisch = node.wordProperties?.berlinerisch || "";
    characterLengths.push(berlinerisch.length);

    const { consonants, vowels } = countLetters(berlinerisch);
    consonantsCounts.push(consonants);
    vowelsCounts.push(vowels);

    const syllablesCount = berlinerisch ? hypher.hyphenate(berlinerisch).length : 0;
    syllablesCounts.push(syllablesCount);
  }

  // Helper to get min/max
  const getMinMax = (arr: number[]) => ({
    max: arr.length ? Math.max(...arr) : 0,
    min: arr.length ? Math.min(...arr) : 0,
  });

  const minMax = {
    characterLength: getMinMax(characterLengths),
    consonantsCount: getMinMax(consonantsCounts),
    syllablesCount: getMinMax(syllablesCounts),
    vowelsCount: getMinMax(vowelsCounts),
  };

  const meta = {
    availableWordGroups,
    rangeFilterMinMax: minMax,
    wordTypes,
  };

  return new Response(JSON.stringify(meta));
};
