import type { Word } from "@services/queries/getWords.ts";
import type { APIRoute } from "astro";

import { fetchAllWords } from "@services/api.ts";
import { hypher } from "@utils/hypher";
import { countLetters, getWordType, translateNlpTags } from "@utils/wordHelper.ts";

export type OramaSearchIndex = ReturnType<typeof makeOramaSearchIndex>;

// Suffix sub-tokens enable compound word search: "Pinsel" finds "Bierpinsel".
// Orama does prefix matching natively; this covers the suffix (head-word) side.
function getWordComponents(word: string, minLen = 4): string[] {
  const parts = word
    .toLowerCase()
    .replace(/[^a-zäöüß]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const suffixes = new Set<string>();
  for (const part of parts) {
    for (let i = 1; i <= part.length - minLen; i++) {
      suffixes.add(part.slice(i));
    }
  }
  return [...suffixes];
}

export function makeOramaSearchIndex(node: Word) {
  const { translations } = node;
  const { berlinerisch } = node.wordProperties;
  const syllablesCount = berlinerisch ? hypher.hyphenate(berlinerisch).length : 0;
  const { consonants, vowels } = countLetters(berlinerisch);

  const wordTypes = [
    ...new Set(translateNlpTags(getWordType(berlinerisch)).flatMap((t) => Object.values(t).flat())),
  ];

  const themen = (node.berlinerischThemen?.nodes ?? [])
    .map((n) => n.slug)
    .filter((s): s is string => typeof s === "string");

  return {
    berlinerWordId: node.berlinerWordId,
    berlinerischWordTypes: wordTypes,
    dateTs: node.dateGmt ? Date.parse(node.dateGmt) : 0,
    modifiedTs: node.modifiedGmt ? Date.parse(node.modifiedGmt) : 0,
    slug: node.slug,
    themen,
    wordComponents: getWordComponents(berlinerisch),
    wordGroup: node.wordGroup ?? "",
    wordProperties: {
      audioBerlinerisch: !!node.wordProperties.berlinerischAudio,
      audioExamples:
        Array.isArray(node.wordProperties.examples) &&
        node.wordProperties.examples.some((e) => !!e?.exampleAudio?.length),
      berlinerisch,
      berolinismus: !!node.wordProperties.berolinismus,
      characterLength: berlinerisch.length,
      consonantsCount: consonants,
      multipleMeanings: !!node.wordProperties.alternativeWords,
      syllablesCount,
      translations,
      vowelsCount: vowels,
    },
  };
}

// index.json and meta.json both need the entries — run the per-word NLP/hyphenation once per build.
let _entriesCache: Promise<OramaSearchIndex[]> | null = null;
export const getSearchIndexEntries = (): Promise<OramaSearchIndex[]> =>
  (_entriesCache ??= fetchAllWords().then((words) => words.map(makeOramaSearchIndex)));

export const GET: APIRoute = async () =>
  new Response(JSON.stringify(await getSearchIndexEntries()));
