import type { APIRoute } from "astro";
import { fetchAllWords } from "@services/api.ts";
import type { BerlinerWord } from "@/gql/graphql.ts";
import Hypher from "hypher";
import german from "hyphenation.de";
import { countLetters, similarSoundingWords } from "@utils/wordHelper.ts";

// Create Hypher instance once
const hypher = new Hypher(german);

function makeOramaSearchIndex(node: BerlinerWord, allWords, similarWordsMap: Map<string, boolean>) {
  const translations = Array.isArray(node.wordProperties?.translations)
    ? node.wordProperties.translations
        .map((t) => t?.translation)
        .filter((tr) => typeof tr === "string")
    : [];

  const berlinerischWordTypes = node?.berlinerischWordTypes?.nodes.map((type) => type.name);

  const berlinerisch = node.wordProperties?.berlinerisch || "";
  const syllablesCount = berlinerisch ? hypher.hyphenate(berlinerisch).length : 0;
  const { consonants, vowels } = countLetters(berlinerisch);

  // Use precomputed similar words map
  const hasSimilarSounding = similarWordsMap.get(berlinerisch) || false;

  return {
    berlinerischWordTypes,
    dateGmt: node.dateGmt,
    modifiedGmt: node.modifiedGmt,
    wordGroup: node.wordGroup,
    slug: node.slug,
    berlinerWordId: node.berlinerWordId,
    wordProperties: {
      berlinerisch,
      berolinismus: node.wordProperties?.berolinismus,
      translations,
      syllablesCount,
      multipleMeanings: !!node.wordProperties?.alternativeWords,
      characterLength: berlinerisch.length,
      audioBerlinerisch: !!node.wordProperties?.berlinerischAudio,
      audioExamples:
        Array.isArray(node?.wordProperties?.examples) &&
        node.wordProperties.examples.some((e) => !!e?.exampleAudio?.length),
      consonantsCount: consonants,
      vowelsCount: vowels,
      similarSoundingWords: hasSimilarSounding,
    },
  };
}

export type OramaSearchIndex = ReturnType<typeof makeOramaSearchIndex>;

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
