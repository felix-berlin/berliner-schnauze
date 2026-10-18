import type { WordRef } from "@utils/wordHelper.ts";

import { fetchAllWords, type SiteWord } from "@services/payload/words.ts";

/** Slim ref of a word, small enough to serialize into island props. */
export const toWordRef = ({ berlinerisch, id, slug }: SiteWord): WordRef => ({
  berlinerisch,
  id,
  slug,
});

const refsByWords = new WeakMap<SiteWord[], WordRef[]>();

/**
 * Slim refs of every word (what the neighbor/anagram/similar-sounding sections compare against), mapped once per
 * memoized words array: the same array is returned until the words reload, so wordHelper can key derived indexes
 * on its identity.
 */
export const fetchWordRefs = async (): Promise<WordRef[]> => {
  const words = await fetchAllWords();
  let refs = refsByWords.get(words);
  if (!refs) refsByWords.set(words, (refs = words.map(toWordRef)));
  return refs;
};
