import { search } from "@orama/orama";
import { FULL_TEXT, getWordDb } from "@services/wordSearchDb.ts";

export type WordSuggestion = { label: string; meaning: string; slug: string };

/** Dictionary words matching `term` for the "Wort verknüpfen" picker, from the same Orama index as the word search. */
export const suggestWords = async (
  term: string,
  exclude: string,
  limit = 6,
): Promise<WordSuggestion[]> => {
  const { db } = await getWordDb();
  const { hits } = await search(db, { ...FULL_TEXT, limit: limit + 1, term });
  return hits
    .map((h) => {
      const doc = h.document as {
        slug?: string;
        wordProperties: { berlinerisch: string; translations: string[] };
      };
      return {
        label: doc.wordProperties.berlinerisch,
        meaning: doc.wordProperties.translations[0] ?? "",
        slug: doc.slug ?? "",
      };
    })
    .filter((s) => s.label && s.slug !== exclude)
    .slice(0, limit);
};
