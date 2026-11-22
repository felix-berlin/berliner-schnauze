import type { Orama, SearchParamsFullText } from "@orama/orama";

import { create, insertMultiple } from "@orama/orama";
import { language, stemmer } from "@orama/stemmers/german";
import { fetchSearchIndex } from "@services/searchIndex.ts";

const wordSchema = {
  berlinerischWordTypes: "enum[]",
  dateTs: "number",
  modifiedTs: "number",
  themen: "enum[]",
  wordComponents: "string[]",
  wordGroup: "enum",
  wordProperties: {
    audioBerlinerisch: "boolean",
    audioExamples: "boolean",
    berlinerisch: "string",
    berolinismus: "boolean",
    characterLength: "number",
    consonantsCount: "number",
    multipleMeanings: "boolean",
    syllablesCount: "number",
    translations: "string[]",
    vowelsCount: "number",
  },
} as const;

export type WordDb = Orama<typeof wordSchema>;

/** Full-text params shared by the word list and the start page search, so both count the same hits. */
export const FULL_TEXT = {
  boost: {
    wordComponents: 1.0,
    "wordProperties.berlinerisch": 2.5,
    "wordProperties.translations": 1,
  },
  // Only the user-facing text fields.
  properties: ["wordComponents", "wordProperties.berlinerisch", "wordProperties.translations"],
  threshold: 0.5,
  tolerance: 1,
} satisfies Partial<SearchParamsFullText<WordDb>>;

let pending: null | Promise<{ db: WordDb; size: number }> = null;

/**
 * Single-flight guard: build the Orama DB from the search index exactly once per page, even when
 * several callers start before the first one settles (rapid typing on a cold cache would otherwise
 * double-insert documents). Lazy: nothing runs until the first call. On failure the memoized
 * promise is cleared so the next call retries. `size` is the number of indexed words.
 */
export function getWordDb(): Promise<{ db: WordDb; size: number }> {
  pending ??= fetchSearchIndex()
    .then(async (words) => {
      const db = create({
        components: {
          tokenizer: {
            language,
            stemmer,
            stemmerSkipProperties: [
              "wordGroup",
              "modifiedTs",
              "dateTs",
              "wordProperties.berolinismus",
              "berlinerischWordTypes",
              "themen",
            ],
            stemming: true,
          },
        },
        schema: wordSchema,
      });
      await insertMultiple(db, words);
      return { db, size: words.length };
    })
    .catch((err: unknown) => {
      pending = null; // allow retry after failure
      throw err;
    });
  return pending;
}
