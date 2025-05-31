import type { APIRoute } from "astro";
import { fetchAllWords } from "@services/api.ts";
import type { BerlinerWord } from "@/gql/graphql.ts";
import Hypher from "hypher";
import german from "hyphenation.de";
import { countLetters, similarSoundingWords } from "@utils/wordHelper.ts";

function makeOramaSearchIndex(node: BerlinerWord, allWords) {
  const hypher = new Hypher(german);
  // At the moment, we are not using examples in the search index.
  //
  // const examples = Array.isArray(node.wordProperties?.examples)
  //   ? node.wordProperties.examples.map((e) => e?.example).filter((ex) => typeof ex === "string")
  //   : [];

  const translations = Array.isArray(node.wordProperties?.translations)
    ? node.wordProperties.translations
        .map((t) => t?.translation)
        .filter((tr) => typeof tr === "string")
    : [];

  const berlinerischWordTypes = node?.berlinerischWordTypes?.nodes.map((type) => type.name);

  return {
    berlinerischWordTypes,
    dateGmt: node.dateGmt,
    modifiedGmt: node.modifiedGmt,
    wordGroup: node.wordGroup,
    slug: node.slug,
    berlinerWordId: node.berlinerWordId,
    wordProperties: {
      berlinerisch: node.wordProperties?.berlinerisch,
      berolinismus: node.wordProperties?.berolinismus,
      translations,
      syllablesCount: hypher.hyphenate(node.wordProperties.berlinerisch).length,
      multipleMeanings: !!node.wordProperties?.alternativeWords,
      characterLength: node.wordProperties?.berlinerisch?.length,
      audioBerlinerisch: !!node.wordProperties?.berlinerischAudio,
      audioExamples:
        (node?.wordProperties?.examples ?? [])
          .map((e) => e?.exampleAudio)
          .filter((a) => !!a?.length).length > 0,
      consonantsCount: countLetters(node.wordProperties?.berlinerisch).consonants,
      vowelsCount: countLetters(node.wordProperties?.berlinerisch).vowels,
      similarSoundingWords: !!similarSoundingWords(
        allWords,
        node.wordProperties?.berlinerisch,
      ).find((word) => word.isSimilar),
    },
  };
}

export type OramaSearchIndex = ReturnType<typeof makeOramaSearchIndex>;

export const GET: APIRoute = async ({ params, request }) => {
  const allWords = await fetchAllWords();

  const oramaSearchIndex = allWords.map(({ node }) => makeOramaSearchIndex(node, allWords));

  return new Response(JSON.stringify(oramaSearchIndex));
};
