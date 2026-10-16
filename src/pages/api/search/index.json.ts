import type { Word } from "@services/queries/getWords.ts";
import type { APIRoute } from "astro";

import { fetchAllWords } from "@services/api.ts";
import { setPageCache } from "@utils/cacheHeaders.ts";
import { deriveWordFields } from "payload-app/word-derived";

export type OramaSearchIndex = ReturnType<typeof makeOramaSearchIndex>;

/** WP-format dates carry no zone but are UTC; `Date.parse` alone would read them in the server's timezone. */
const utcTimestamp = (date: string | null): number =>
  date ? Date.parse(/(?:Z|[+-]\d\d:?\d\d)$/i.test(date) ? date : `${date}Z`) : 0;

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
    dateTs: utcTimestamp(node.dateGmt),
    modifiedTs: utcTimestamp(node.modifiedGmt),
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

// index.json and meta.json both need the entries: map each (memoized) words array once.
const entriesByWords = new WeakMap<Word[], OramaSearchIndex[]>();

export const getSearchIndexEntries = async (): Promise<OramaSearchIndex[]> => {
  const words = await fetchAllWords();
  let entries = entriesByWords.get(words);
  if (!entries) entriesByWords.set(words, (entries = words.map(makeOramaSearchIndex)));
  return entries;
};

export const GET: APIRoute = async () => {
  const res = new Response(JSON.stringify(await getSearchIndexEntries()), {
    headers: { "Content-Type": "application/json" },
  });
  setPageCache(res);
  return res;
};
