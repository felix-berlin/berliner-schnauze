import type { APIRoute } from "astro";

import { fetchAllWords } from "@services/api.ts";
import { setPageCache } from "@utils/cacheHeaders.ts";
import { wpDateMs } from "@utils/wpDate.ts";
import { deriveWordFields } from "payload-app/word-derived";

import type { Word } from "@/types/cms.ts";

export type OramaSearchIndex = ReturnType<typeof makeOramaSearchIndex>;

/** Assembles the slim public entry from stored fields: nothing here may carry definitions, examples or sources. */
export function makeOramaSearchIndex(node: Word) {
  const { translations } = node;
  const { berlinerisch } = node.wordProperties;
  // Stored on save in Payload; computed only for a word that was never saved through the hook.
  const derived = node.derived ?? deriveWordFields(berlinerisch);

  const wordTypes = [
    ...new Set(
      ((derived.nlpTags ?? []) as Record<string, string[]>[]).flatMap((t) =>
        Object.values(t).flat(),
      ),
    ),
  ];

  const themen = (node.berlinerischThemen?.nodes ?? [])
    .map((n) => n.slug)
    .filter((s): s is string => typeof s === "string");

  return {
    berlinerWordId: node.berlinerWordId,
    berlinerischWordTypes: wordTypes,
    dateTs: wpDateMs(node.dateGmt) || 0,
    modifiedTs: wpDateMs(node.modifiedGmt) || 0,
    slug: node.slug,
    themen,
    wordComponents: derived.wordComponents ?? [],
    wordGroup: node.wordGroup ?? "",
    wordProperties: {
      audioBerlinerisch: !!node.wordProperties.berlinerischAudio,
      audioExamples:
        Array.isArray(node.wordProperties.examples) &&
        node.wordProperties.examples.some((e) => !!e?.exampleAudio?.length),
      berlinerisch,
      berolinismus: !!node.wordProperties.berolinismus,
      characterLength: derived.characterLength ?? berlinerisch.length,
      consonantsCount: derived.consonantsCount ?? 0,
      multipleMeanings: !!node.wordProperties.alternativeWords,
      syllablesCount: derived.syllablesCount ?? 0,
      translations,
      vowelsCount: derived.vowelsCount ?? 0,
    },
  };
}

// index.json and meta.json both need the entries: map (and serialize) each memoized words array once.
const indexByWords = new WeakMap<Word[], { entries: OramaSearchIndex[]; json: string }>();

const searchIndex = async () => {
  const words = await fetchAllWords();
  let index = indexByWords.get(words);
  if (!index) {
    const entries = words.map(makeOramaSearchIndex);
    indexByWords.set(words, (index = { entries, json: JSON.stringify(entries) }));
  }
  return index;
};

export const getSearchIndexEntries = async (): Promise<OramaSearchIndex[]> =>
  (await searchIndex()).entries;

export const GET: APIRoute = async () =>
  setPageCache(
    new Response((await searchIndex()).json, { headers: { "Content-Type": "application/json" } }),
  );
