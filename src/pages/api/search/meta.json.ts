import type { APIRoute } from "astro";
import { fetchAllWords } from "@services/api.ts";
import Hypher from "hypher";
import german from "hyphenation.de";
import { countLetters } from "@utils/wordHelper.ts";

const hypher = new Hypher(german);

export const GET: APIRoute = async () => {
  const allWords = await fetchAllWords();

  const availableWordGroups = Array.from(
    new Set(allWords.map(({ node }) => node.wordGroup?.toUpperCase())),
  )
    .filter(Boolean)
    .sort();

  const wordTypes = Array.from(
    new Set(
      allWords
        .map(({ node }) => node.berlinerischWordTypes?.nodes)
        .flat()
        .map((node) => node?.name),
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
    min: arr.length ? Math.min(...arr) : 0,
    max: arr.length ? Math.max(...arr) : 0,
  });

  const minMax = {
    characterLength: getMinMax(characterLengths),
    consonantsCount: getMinMax(consonantsCounts),
    vowelsCount: getMinMax(vowelsCounts),
    syllablesCount: getMinMax(syllablesCounts),
  };

  const meta = {
    availableWordGroups,
    wordTypes,
    rangeFilterMinMax: minMax,
  };

  return new Response(JSON.stringify(meta));
};
