import type { WordRef } from "@utils/wordHelper.ts";

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

/** Slim refs of every word (what the neighbor/anagram/similar-sounding sections compare against). */
export const fetchWordRefs = async (): Promise<WordRef[]> => (await fetchAllWords()).map(toWordRef);
