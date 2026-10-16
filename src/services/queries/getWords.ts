import type { WordRef } from "@utils/wordHelper.ts";

import { ttl } from "@services/cache.ts";
import { fetchAllWords } from "@services/payload/words.ts";

import type { Word } from "@/types/cms.ts";

export type { Word };
export { fetchAllWords };

/** Slim ref of a word, small enough to serialize into island props. */
export const toWordRef = ({ id, slug, wordProperties }: Word): WordRef => ({
  id,
  slug,
  wordProperties: { berlinerisch: wordProperties.berlinerisch },
});

/**
 * Slim refs of every word (what the neighbor/anagram/similar-sounding sections compare against). The same
 * array is returned within the window: wordHelper keeps derived indexes keyed on its identity.
 */
export const fetchWordRefs = ttl(60_000, async (): Promise<WordRef[]> =>
  (await fetchAllWords()).map(toWordRef),
);
