import { fetchAllWords } from "@services/payload/words.ts";
import { pickFooterWords, type FooterWord } from "@utils/footerWords.ts";
import { reportAndFallback } from "@utils/reportError.ts";

/**
 * What the footer needs from the word list, read once per request (from the cached list, no extra query): about 30
 * random words for the sign and the total for the "Über N Wörter" line. A failing list never fails the page: it is
 * reported and the footer renders without a sign and without a count.
 */
export const fetchFooterData = async (
  excludeSlug?: string,
  count?: number,
): Promise<{ words: FooterWord[]; wordCount: number }> => {
  const all = await reportAndFallback("[footer] word list", null, fetchAllWords);
  return all
    ? { wordCount: all.length, words: pickFooterWords(all, excludeSlug, count) }
    : { wordCount: 0, words: [] };
};
