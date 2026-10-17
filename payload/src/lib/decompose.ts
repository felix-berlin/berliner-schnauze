import { createRequire } from "node:module";

// all-the-german-words is a ~28 MB JSON array (~150 MB as a Set): loaded on the first save that needs it, in the
// CMS process only. The site reads the stored result (derived.decomposition) and never loads it.
let germanWordsCache: Set<string> | undefined;
const getGermanWords = (): Set<string> =>
  (germanWordsCache ??= new Set(
    (createRequire(import.meta.url)("all-the-german-words") as string[]).map((w) => w.toLowerCase()),
  ));

/** Splits a German compound into two dictionary words (`bierpinsel` → bier + pinsel), or null if it is none. */
export const decomposeCompoundWord = (word: string, dictionary?: Set<string>): string[] | null => {
  const lower = word.toLowerCase();
  if (lower.length < 5) return null; // Too short to be a compound
  const germanWords = dictionary ?? getGermanWords();
  if (germanWords.has(lower)) return null;

  for (let i = 3; i <= lower.length - 3; i++) {
    const left = lower.slice(0, i);
    const right = lower.slice(i);

    if (germanWords.has(left) && germanWords.has(right)) {
      return [left, right];
    }

    // Fugen-s: "tageslicht" → "tages" (tag+s) + "licht"
    if (
      right.startsWith("s") &&
      right.length >= 3 &&
      germanWords.has(left) &&
      germanWords.has(right.slice(1))
    ) {
      return [left, right.slice(1)];
    }
  }

  return null;
};
