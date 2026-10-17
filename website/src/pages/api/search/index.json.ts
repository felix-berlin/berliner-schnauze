import type { APIRoute } from "astro";

import { fetchAllWords } from "@services/api.ts";
import { type SiteWord, translationTexts } from "@services/payload/words.ts";
import { setPageCache } from "@utils/cacheHeaders.ts";
import { deriveWordFields } from "payload-app/word-derived";

export type OramaSearchIndex = ReturnType<typeof makeOramaSearchIndex>;

/** Epoch ms of an ISO date, 0 when absent or invalid. */
const timestamp = (iso: string | null | undefined): number => (iso && Date.parse(iso)) || 0;

/**
 * Assembles the slim public entry from stored fields: nothing here may carry definitions, examples or sources.
 * Its shape is public (cached by the service worker on visitors' devices).
 */
export function makeOramaSearchIndex(word: SiteWord) {
  const { berlinerisch } = word;
  // Stored on save in Payload; computed only for a word that was never saved through the hook.
  const derived = word.derived ?? deriveWordFields(berlinerisch);

  const wordTypes = [
    ...new Set(
      ((derived.nlpTags ?? []) as Record<string, string[]>[]).flatMap((t) =>
        Object.values(t).flat(),
      ),
    ),
  ];

  return {
    berlinerischWordTypes: wordTypes,
    dateTs: timestamp(word.publishedAt),
    modifiedTs: timestamp(word.contentModifiedAt),
    slug: word.slug,
    themen: word.themen.flatMap((t) => t.slug ?? []),
    wordComponents: derived.wordComponents ?? [],
    wordGroup: word.derived?.wordGroup ?? "",
    wordProperties: {
      audioBerlinerisch: word.berlinerischAudio.length > 0,
      audioExamples: word.examples.some((e) => e.exampleAudio.length > 0),
      berlinerisch,
      berolinismus: !!word.berolinismus,
      characterLength: derived.characterLength ?? berlinerisch.length,
      consonantsCount: derived.consonantsCount ?? 0,
      multipleMeanings: (word.alternativeWords?.length ?? 0) > 0,
      syllablesCount: derived.syllablesCount ?? 0,
      translations: translationTexts(word),
      vowelsCount: derived.vowelsCount ?? 0,
    },
  };
}

// index.json and meta.json both need the entries: map (and serialize) each memoized words array once.
const indexByWords = new WeakMap<SiteWord[], { entries: OramaSearchIndex[]; json: string }>();

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
