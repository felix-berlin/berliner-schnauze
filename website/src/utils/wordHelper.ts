import type { Word } from "payload-app";

import { fetchWikimediaAPI } from "@services/wikimediaApi.ts";
// Deep import: the package entry loads all of natural (classifiers, WordNet, ...) for this one function.
import JaroWinklerDistance from "natural/lib/natural/distance/jaro-winkler_distance.js";
import {
  isConsonantChar,
  isVowelChar,
  LETTER_RE,
  soundexCode,
  VOWELS,
} from "payload-app/word-derived";

export {
  countLetters,
  getWordType,
  translateNlpTags,
  type WordTags,
} from "payload-app/word-derived";

/** Minimal word shape for cross-word helpers; a `SiteWord` from fetchAllWords satisfies it. */
export type WordRef = { berlinerisch: string; id: number; slug: string };

/**
 * Returns the word with vowels and consonants colored.
 *
 * @param   {string}  word  [word description]
 *
 * @return  {string}        [return description]
 */
export const coloredConsonantsAndVowels = (word: string): string => {
  let html = "";

  for (const char of word) {
    if (isVowelChar(char.toLowerCase())) {
      html += `<span class="is-vowel">${char}</span>`; // Vowels
    } else {
      html += `<span class="is-consonant">${char}</span>`; // Consonants
    }
  }

  return html;
};

// Soundex compare() is exact code equality, so — like findAnagrams — we can bucket by
// code once per array instead of running compare() against all ~6000 words on every page.
const soundexIndexCache = new WeakMap<WordRef[], Map<string, WordRef[]>>();

/** Words (other than `currentWord`) whose berlinerisch shares its Soundex code. */
export const similarSoundingWords = (allWords: WordRef[], currentWord: WordRef): WordRef[] => {
  let index = soundexIndexCache.get(allWords);
  if (!index) {
    index = new Map();
    for (const word of allWords) {
      const { berlinerisch } = word;
      if (!berlinerisch) continue;
      const code = soundexCode(berlinerisch);
      const bucket = index.get(code);
      if (bucket) bucket.push(word);
      else index.set(code, [word]);
    }
    soundexIndexCache.set(allWords, index);
  }

  const currentBerlinerisch = currentWord.berlinerisch;
  if (!currentBerlinerisch) return [];
  return (index.get(soundexCode(currentBerlinerisch)) ?? []).filter(
    (word) => word.id !== currentWord.id,
  );
};

// ~6000 Jaro-Winkler comparisons per word: computed once per word and refs array (a cache window), not per request.
const similarWordsCache = new WeakMap<
  WordRef[],
  Map<string, { isSimilar: number; word: WordRef }[]>
>();

/** The words similar in spelling to `currentWord`; memoized per refs array, so do not mutate the result. */
export const similarWords = (
  allWords: WordRef[],
  currentWord: WordRef,
  needsSimilarity?: number,
) => {
  let byWord = similarWordsCache.get(allWords);
  if (!byWord) similarWordsCache.set(allWords, (byWord = new Map()));
  // the headword too: a draft preview shares the id but may spell the word differently
  const key = `${currentWord.id}:${currentWord.berlinerisch}:${needsSimilarity}`;
  const cached = byWord.get(key);
  if (cached) return cached;

  const currentBerlinerisch = currentWord.berlinerisch;
  const results: { isSimilar: number; word: WordRef }[] = [];
  byWord.set(key, results);

  // Length pre-filter. With m ≤ min(len), Jaro ≤ (2 + r) / 3 where r = min/max length, and
  // natural's Winkler boost (prefix ≤ 4, p = 0.1) gives JW ≤ 0.6·Jaro + 0.4 ≤ 0.8 + 0.2·r.
  // So a candidate can only reach the threshold when r ≥ (threshold − 0.8) / 0.2.
  const minRatio = needsSimilarity === undefined ? 0 : (needsSimilarity - 0.8) / 0.2 - 1e-9;
  const currentLength = currentBerlinerisch.length;

  for (const word of allWords) {
    if (word.id === currentWord.id) continue;
    const candidate = word.berlinerisch;
    if (
      minRatio > 0 &&
      Math.min(candidate.length, currentLength) <
        minRatio * Math.max(candidate.length, currentLength)
    ) {
      continue;
    }
    const isSimilar = JaroWinklerDistance(candidate, currentBerlinerisch);
    if (needsSimilarity === undefined || isSimilar >= needsSimilarity) {
      results.push({ isSimilar, word });
    }
  }

  return results;
};

export const createWikimediaFileList = async (wikimediaFiles: Word["wikimediaFiles"]) => {
  if (!wikimediaFiles?.length) return [];

  const results = await Promise.allSettled(
    wikimediaFiles.map(async (file) => {
      const img = await fetchWikimediaAPI(file?.wikimediaFile ?? "");
      return { caption: file?.caption, description: file?.description, image: img };
    }),
  );

  const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failed.length > 0) {
    console.error(
      "[wordHelper] createWikimediaFileList: failed to fetch",
      failed.length,
      "file(s):",
      failed.map((f) => f.reason),
    );
  }

  return results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
};

export const capitalizeFirstLetter = (word: string) => {
  return word.charAt(0).toUpperCase() + word.slice(1);
};

const GERMAN_LETTER_FREQ: Record<string, number> = {
  a: 6.51,
  b: 1.96,
  c: 3.06,
  d: 4.81,
  e: 17.4,
  f: 1.66,
  g: 3.01,
  h: 4.76,
  i: 7.55,
  j: 0.27,
  k: 1.21,
  l: 3.44,
  m: 2.53,
  n: 9.78,
  o: 2.51,
  p: 0.97,
  q: 0.02,
  r: 7.0,
  s: 7.27,
  t: 6.15,
  u: 4.35,
  v: 0.67,
  w: 1.89,
  x: 0.03,
  y: 0.04,
  z: 1.13,
  ß: 0.31,
  ä: 0.54,
  ö: 0.3,
  ü: 0.65,
};

const frequencyLabel = (pct: number): string => {
  if (pct > 10) return "sehr häufig";
  if (pct > 5) return "häufig";
  if (pct > 2) return "gelegentlich";
  if (pct > 1) return "selten";
  return "sehr selten";
};

export const letterFrequency = (
  word: string,
): Array<{ char: string; percent: number; label: string; isVowel: boolean }> => {
  const seen = new Set<string>();
  return word
    .toLowerCase()
    .split("")
    .filter((c) => {
      if (seen.has(c) || !(c in GERMAN_LETTER_FREQ)) return false;
      seen.add(c);
      return true;
    })
    .map((char) => ({
      char,
      isVowel: isVowelChar(char),
      label: frequencyLabel(GERMAN_LETTER_FREQ[char]!),
      percent: GERMAN_LETTER_FREQ[char]!,
    }));
};

export const wordCuriosities = (
  word: string,
): {
  isPalindrome: boolean;
  hasAllVowels: boolean;
  hasUmlaut: boolean;
  isIsogram: boolean;
  isAlternating: boolean;
  longestConsonantRun: { length: number; chars: string };
  longestVowelRun: { length: number; chars: string };
  doubleLetters: string[];
  uniqueLetterCount: number;
  totalLetterCount: number;
  distinctVowelCount: number;
  startsWithConsonant: boolean;
  endsWithConsonant: boolean;
} => {
  const lower = word.toLowerCase();
  const letters = lower.split("").filter((c) => LETTER_RE.test(c));

  const isPalindrome = lower === lower.split("").reverse().join("");
  const distinctVowelCount = [...VOWELS].filter((v) => lower.includes(v)).length;
  const hasAllVowels = distinctVowelCount === VOWELS.size;

  const UMLAUTS = new Set(["ä", "ö", "ü", "Ä", "Ö", "Ü"]);
  const hasUmlaut = Array.from(word).some((c) => UMLAUTS.has(c));

  const letterFreq = new Map<string, number>();
  for (const c of letters) {
    letterFreq.set(c, (letterFreq.get(c) ?? 0) + 1);
  }
  const isIsogram = letters.length > 0 && [...letterFreq.values()].every((n) => n === 1);

  let longestConsonantRun = { chars: "", length: 0 };
  let longestVowelRun = { chars: "", length: 0 };
  let currentConsonantRun = "";
  let currentVowelRun = "";
  for (const c of lower) {
    if (isConsonantChar(c)) {
      currentConsonantRun += c;
      currentVowelRun = "";
      if (currentConsonantRun.length > longestConsonantRun.length) {
        longestConsonantRun = { chars: currentConsonantRun, length: currentConsonantRun.length };
      }
    } else if (isVowelChar(c)) {
      currentVowelRun += c;
      currentConsonantRun = "";
      if (currentVowelRun.length > longestVowelRun.length) {
        longestVowelRun = { chars: currentVowelRun, length: currentVowelRun.length };
      }
    } else {
      currentConsonantRun = "";
      currentVowelRun = "";
    }
  }

  const doubleLettersSet = new Set<string>();
  for (let i = 0; i < lower.length - 1; i++) {
    if (lower[i] === lower[i + 1] && LETTER_RE.test(lower[i])) {
      doubleLettersSet.add(lower[i]);
    }
  }

  let isAlternating = letters.length >= 4;
  for (let i = 0; i < letters.length - 1; i++) {
    if (isVowelChar(letters[i]) === isVowelChar(letters[i + 1])) {
      isAlternating = false;
      break;
    }
  }

  return {
    distinctVowelCount,
    doubleLetters: [...doubleLettersSet],
    endsWithConsonant: isConsonantChar(lower[lower.length - 1] ?? ""),
    hasAllVowels,
    hasUmlaut,
    isAlternating,
    isIsogram,
    isPalindrome,
    longestConsonantRun,
    longestVowelRun,
    startsWithConsonant: isConsonantChar(lower[0] ?? ""),
    totalLetterCount: letters.length,
    uniqueLetterCount: letterFreq.size,
  };
};

const sortedChars = (word: string): string => word.toLowerCase().split("").sort().join("");

// Per-page callers pass the same ~6000-word array; index it once instead of once per page.
const anagramIndexCache = new WeakMap<WordRef[], Map<string, WordRef[]>>();

export const findAnagrams = (word: string, allWords: WordRef[]): WordRef[] => {
  let index = anagramIndexCache.get(allWords);
  if (!index) {
    index = new Map();
    for (const w of allWords) {
      const key = sortedChars(w.berlinerisch);
      const bucket = index.get(key);
      if (bucket) bucket.push(w);
      else index.set(key, [w]);
    }
    anagramIndexCache.set(allWords, index);
  }
  const lower = word.toLowerCase();
  return (index.get(sortedChars(word)) ?? []).filter((w) => w.berlinerisch.toLowerCase() !== lower);
};

const germanCollator = new Intl.Collator("de");
const sortedWordsCache = new WeakMap<
  WordRef[],
  { sorted: WordRef[]; indexById: Map<WordRef["id"], number> }
>();

export const alphabeticNeighbors = (
  allWords: WordRef[],
  currentWord: WordRef,
  n: number = 3,
): { before: WordRef[]; after: WordRef[] } => {
  let cached = sortedWordsCache.get(allWords);
  if (!cached) {
    const sorted = [...allWords].sort((a, b) =>
      germanCollator.compare(a.berlinerisch.toLowerCase(), b.berlinerisch.toLowerCase()),
    );
    const indexById = new Map<WordRef["id"], number>();
    // First occurrence wins, matching the previous findIndex semantics.
    sorted.forEach((w, i) => {
      if (!indexById.has(w.id)) indexById.set(w.id, i);
    });
    cached = { indexById, sorted };
    sortedWordsCache.set(allWords, cached);
  }
  const { sorted, indexById } = cached;
  const idx = indexById.get(currentWord.id) ?? -1;
  if (idx === -1) return { after: [], before: [] };
  return {
    after: sorted.slice(idx + 1, idx + 1 + n),
    before: sorted.slice(Math.max(0, idx - n), idx).reverse(),
  };
};

const byHeadwordCache = new WeakMap<WordRef[], Map<string, WordRef>>();

/** The word with this headword (case-insensitive, the last of duplicates), via an index per refs array. */
export const findWordByHeadword = (allWords: WordRef[], headword: string): WordRef | undefined => {
  let index = byHeadwordCache.get(allWords);
  if (!index) {
    index = new Map(allWords.map((w) => [w.berlinerisch.toLowerCase(), w]));
    byHeadwordCache.set(allWords, index);
  }
  return index.get(headword.toLowerCase());
};
