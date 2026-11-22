import { fetchAllWords } from "@services/payload/words.ts";
import { pickFooterWords, type FooterWord } from "@utils/footerWords.ts";

/**
 * About 30 random words for the footer sign, picked per request from the cached word list (memory only, no extra
 * query). A failing word list never fails the page: the footer then renders without a sign.
 */
export const fetchFooterWords = async (excludeSlug?: string): Promise<FooterWord[]> => {
  try {
    return pickFooterWords(await fetchAllWords(), excludeSlug);
  } catch (error) {
    console.error("[footer] words unavailable", error);
    return [];
  }
};
