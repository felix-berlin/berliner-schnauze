import type { APIRoute } from "astro";

import { fetchAllWords } from "@services/api.ts";
import {
  countLetters,
  getWordType,
  similarSoundingWords,
  translateNlpTags,
} from "@utils/wordHelper.ts";
import german from "hyphenation.de";
import Hypher from "hypher";

import type { BerlinerWord } from "@/gql/graphql.ts";

// Create Hypher instance once
const hypher = new Hypher(german);

export type OramaSearchIndex = ReturnType<typeof makeOramaSearchIndex>;

function extractWordTypes(wordTags: any): string[] {
  // wordTags can be an array of objects or a single object
  const tagObjs = Array.isArray(wordTags) ? wordTags : [wordTags];
  // Collect all type arrays, flatten, deduplicate
  return Array.from(
    new Set(
      tagObjs.flatMap((obj) => (obj && typeof obj === "object" ? Object.values(obj).flat() : [])),
    ),
  );
}

function makeOramaSearchIndex(node: BerlinerWord, allWords, similarWordsMap: Map<string, boolean>) {
  const translations = Array.isArray(node.wordProperties?.translations)
    ? node.wordProperties.translations
        .map((t) => t?.translation)
        .filter((tr) => typeof tr === "string")
    : [];

  // Manually curated word types
  // const berlinerischWordTypes = node?.berlinerischWordTypes?.nodes.map((type) => type.name);

  const berlinerisch = node.wordProperties?.berlinerisch || "";
  const syllablesCount = berlinerisch ? hypher.hyphenate(berlinerisch).length : 0;
  const { consonants, vowels } = countLetters(berlinerisch);

  // Use precomputed similar words map
  const hasSimilarSounding = similarWordsMap.get(berlinerisch) || false;

  const wordTags = translateNlpTags(getWordType(berlinerisch));
  const wordTypes = extractWordTypes(wordTags);

  return {
    berlinerischWordTypes: wordTypes,
    berlinerWordId: node.berlinerWordId,
    dateGmt: node.dateGmt,
    modifiedGmt: node.modifiedGmt,
    slug: node.slug,
    wordGroup: node.wordGroup,
    wordProperties: {
      audioBerlinerisch: !!node.wordProperties?.berlinerischAudio,
      audioExamples:
        Array.isArray(node?.wordProperties?.examples) &&
        node.wordProperties.examples.some((e) => !!e?.exampleAudio?.length),
      berlinerisch,
      berolinismus: node.wordProperties?.berolinismus,
      characterLength: berlinerisch.length,
      consonantsCount: consonants,
      multipleMeanings: !!node.wordProperties?.alternativeWords,
      similarSoundingWords: hasSimilarSounding,
      syllablesCount,
      translations,
      vowelsCount: vowels,
    },
  };
}

export const GET: APIRoute = async () => {
  const allWords = await fetchAllWords();

  // Precompute similar sounding words for all berlinerisch words
  const similarWordsMap = new Map<string, boolean>();
  for (const { node } of allWords) {
    const berlinerisch = node.wordProperties?.berlinerisch;
    if (berlinerisch && !similarWordsMap.has(berlinerisch)) {
      const similar = similarSoundingWords(allWords, berlinerisch).some((word) => word.isSimilar);
      similarWordsMap.set(berlinerisch, similar);
    }
  }

  const oramaSearchIndex = allWords.map(({ node }) =>
    makeOramaSearchIndex(node, allWords, similarWordsMap),
  );

  return new Response(JSON.stringify(oramaSearchIndex));
};
