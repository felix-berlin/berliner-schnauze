import type { SiteWord } from "@services/payload/words.ts";

import { shuffle } from "@utils/helpers.ts";

/** What the footer sign needs from a word, nothing more. */
export type FooterWord = {
  example: string | null;
  /** Article, else the first word type, as one display string. */
  kind: string | null;
  lemma: string;
  meaning: string;
  slug: string;
};

export type FooterSourceWord = Pick<SiteWord, "article" | "berlinerisch" | "slug"> &
  Partial<Pick<SiteWord, "examples" | "translations" | "wordTypes">>;

const firstText = (
  items: ({ [key: string]: unknown } | null | undefined)[] | null | undefined,
  key: string,
) =>
  (items ?? [])
    .map((item) => item?.[key])
    .find((v): v is string => typeof v === "string" && v.trim() !== "")
    ?.trim() ?? null;

/** Null for a word without a meaning: the sign could not show it. */
export const toFooterWord = (word: FooterSourceWord): FooterWord | null => {
  const meaning = firstText(word.translations, "translation");
  if (!meaning) return null;
  return {
    example: firstText(word.examples, "example"),
    kind: word.article?.trim() || word.wordTypes?.[0]?.name || null,
    lemma: word.berlinerisch,
    meaning,
    slug: word.slug,
  };
};

type Random = () => number;

/** A random selection of at most `count` showable words, without `excludeSlug` (the page's own word). */
export const pickFooterWords = (
  words: readonly FooterSourceWord[],
  excludeSlug?: string,
  count = 30,
  random: Random = Math.random,
): FooterWord[] => {
  // Partial Fisher–Yates: stops once `count` words are found, so ~6000 words are not fully shuffled per request.
  const pool = [...words];
  const picked: FooterWord[] = [];
  for (let i = pool.length; i > 0 && picked.length < count; i--) {
    const j = Math.floor(random() * i);
    [pool[j], pool[i - 1]] = [pool[i - 1]!, pool[j]!];
    const word = pool[i - 1]!;
    const footerWord = word.slug === excludeSlug ? null : toFooterWord(word);
    if (footerWord) picked.push(footerWord);
  }
  return picked;
};

/**
 * Walks the words in shuffled order starting with the first one (the server-rendered word). Every word shows once
 * before any repeats; after a reshuffle the first word differs from the last one shown.
 */
export const createWordCycle = (words: readonly FooterWord[], random: Random = Math.random) => {
  let current: FooterWord | null = words[0] ?? null;
  let queue = shuffle(words.slice(1), random);
  return {
    get current() {
      return current;
    },
    next(): FooterWord | null {
      if (words.length < 2) return current;
      if (queue.length === 0) {
        queue = shuffle(words, random);
        if (queue[0] === current) queue.push(queue.shift()!);
      }
      current = queue.shift()!;
      return current;
    },
  };
};
