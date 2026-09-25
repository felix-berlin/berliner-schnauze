import { fetchWikimediaAPI } from "@services/wikimediaApi.ts";
import nlp from "de-compromise";
import natural from "natural";
import { createRequire } from "node:module";

import type { WordPropertiesWikimediaFiles } from "@/gql/entity-types";

/** Minimal word shape for cross-word helpers; `Word` from fetchAllWords satisfies it. */
export type WordRef = {
  id: string;
  slug: string;
  wordProperties: { berlinerisch: string };
};

// all-the-german-words is a ~28 MB JSON array — require it on first use instead of at module
// load, so importers that never decompose words (e.g. the search index) don't pay for it.
let germanWordsCache: Set<string> | undefined;
export const getGermanWords = (): Set<string> =>
  (germanWordsCache ??= new Set(
    (createRequire(import.meta.url)("all-the-german-words") as string[]).map((w) =>
      w.toLowerCase(),
    ),
  ));

const VOWELS = new Set(["a", "e", "i", "o", "u", "ä", "ö", "ü"]);
const LETTER_RE = /[a-zäöüß]/i;

/** Expects a lowercase char. */
const isVowelChar = (c: string): boolean => VOWELS.has(c);
/** Expects a lowercase char. */
const isConsonantChar = (c: string): boolean => LETTER_RE.test(c) && !isVowelChar(c);

const _soundEx = new natural.SoundEx();

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

export const countLetters = (word: string) => {
  let vowelsCount = 0;
  let consonantsCount = 0;

  for (const char of word.toLowerCase()) {
    if (isVowelChar(char)) {
      vowelsCount++;
    } else if (isConsonantChar(char)) {
      consonantsCount++;
    }
  }

  return {
    consonants: consonantsCount,
    vowels: vowelsCount,
  };
};

type TagTranslations = {
  [key: string]: string;
};

type WordTags = {
  [key: string]: string[];
};

export const getWordType = (word: string): WordTags[] => {
  const doc = nlp(word);

  return doc.out("tags");
};

const tagTranslations: TagTranslations = {
  Abbreviation: "Abkürzung",
  Acronym: "Akronym",
  Activity: "Aktivität",
  Actor: "Schauspieler",
  Address: "Adresse",
  Adjective: "Adjektiv",
  Adverb: "Adverb",
  AtMention: "@Erwähnung",
  Auxiliary: "Hilfsverb",
  Cardinal: "Kardinalzahl",
  City: "Stadt",
  Company: "Unternehmen",
  Comparable: "Vergleichbar",
  Comparative: "Komparativ",
  Conjunction: "Konjunktion",
  Contraction: "Kontraktion",
  Copula: "Kopula",
  Country: "Land",
  Currency: "Währung",
  Date: "Datum",
  Demonym: "Demonym",
  Determiner: "Artikel",
  Duration: "Dauer",
  Email: "E-Mail",
  Emoji: "Emoji",
  Emoticon: "Emoticon",
  Expression: "Ausdruck",
  FemaleName: "Weiblicher Name",
  FemaleNoun: "Weibliches Nomen",
  FirstName: "Vorname",
  FirstPerson: "Erste Person",
  Fraction: "Bruchzahl",
  FuturePerfect: "Futur II",
  Gerund: "Gerundium",
  Hashtag: "Hashtag",
  Holiday: "Feiertag",
  Honorific: "Anrede",
  Infinitive: "Infinitiv",
  LastName: "Nachname",
  MaleName: "Männlicher Name",
  MaleNoun: "Männliches Nomen",
  Modal: "Modalverb",
  Money: "Geld",
  Month: "Monat",
  Multiple: "Mehrfach",
  Negative: "Negation",
  NeuterNoun: "Neutrum Nomen",
  Noun: "Nomen",
  NumericValue: "Numerischer Wert",
  Ordinal: "Ordinalzahl",
  Organization: "Organisation",
  Participle: "Partizip",
  Particle: "Partikel",
  PastTense: "Präteritum",
  Percent: "Prozent",
  PerfectTense: "Perfekt",
  Person: "Person",
  PhoneNumber: "Telefonnummer",
  PhrasalVerb: "Phrasalverb",
  Place: "Ort",
  Pluperfect: "Plusquamperfekt",
  Plural: "Mehrzahl",
  Possessive: "Possessivpronomen",
  Preposition: "Präposition",
  PresentTense: "Präsens",
  Pronoun: "Pronomen",
  ProperNoun: "Eigenname",
  QuestionWord: "Fragepronomen",
  Region: "Region",
  RelativeDay: "Relativer Tag",
  RomanNumeral: "Römische Zahl",
  School: "Schule",
  SecondPerson: "Zweite Person",
  Singular: "Einzahl",
  SportsTeam: "Sportteam",
  Superlative: "Superlativ",
  TextCardinal: "Text-Kardinalzahl",
  TextValue: "Textwert",
  ThirdPerson: "Dritte Person",
  Time: "Zeit",
  URL: "URL",
  Uncountable: "Unzählbar",
  Unit: "Einheit",
  Value: "Wert",
  Verb: "Verb",
  WeekDay: "Wochentag",
  Year: "Jahr",
};

export const translateNlpTags = (tags: WordTags[]): WordTags[] => {
  const translatedTags: WordTags[] = tags.map((tag: WordTags) => {
    const translatedTag: WordTags = {};
    for (const word in tag) {
      const englishTags = tag[word];
      const germanTags = englishTags.map((englishTag) => tagTranslations[englishTag] || englishTag);
      translatedTag[word] = germanTags;
    }
    return translatedTag;
  });

  return translatedTags;
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
      const { berlinerisch } = word.wordProperties;
      if (!berlinerisch) continue;
      const code = _soundEx.process(berlinerisch);
      const bucket = index.get(code);
      if (bucket) bucket.push(word);
      else index.set(code, [word]);
    }
    soundexIndexCache.set(allWords, index);
  }

  const currentBerlinerisch = currentWord.wordProperties.berlinerisch;
  if (!currentBerlinerisch) return [];
  return (index.get(_soundEx.process(currentBerlinerisch)) ?? []).filter(
    (word) => word.id !== currentWord.id,
  );
};

export const similarWords = (
  allWords: WordRef[],
  currentWord: WordRef,
  needsSimilarity?: number,
) => {
  const currentBerlinerisch = currentWord.wordProperties.berlinerisch;
  const results: { isSimilar: number; word: WordRef }[] = [];

  // Length pre-filter. With m ≤ min(len), Jaro ≤ (2 + r) / 3 where r = min/max length, and
  // natural's Winkler boost (prefix ≤ 4, p = 0.1) gives JW ≤ 0.6·Jaro + 0.4 ≤ 0.8 + 0.2·r.
  // So a candidate can only reach the threshold when r ≥ (threshold − 0.8) / 0.2.
  const minRatio = needsSimilarity === undefined ? 0 : (needsSimilarity - 0.8) / 0.2 - 1e-9;
  const currentLength = currentBerlinerisch.length;

  for (const word of allWords) {
    if (word.id === currentWord.id) continue;
    const candidate = word.wordProperties.berlinerisch;
    if (
      minRatio > 0 &&
      Math.min(candidate.length, currentLength) <
        minRatio * Math.max(candidate.length, currentLength)
    ) {
      continue;
    }
    const isSimilar = natural.JaroWinklerDistance(candidate, currentBerlinerisch);
    if (needsSimilarity === undefined || isSimilar >= needsSimilarity) {
      results.push({ isSimilar, word });
    }
  }

  return results;
};

export const createWikimediaFileList = async (
  wikimediaFiles: WordPropertiesWikimediaFiles[] | null | undefined,
) => {
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
      const key = sortedChars(w.wordProperties.berlinerisch);
      const bucket = index.get(key);
      if (bucket) bucket.push(w);
      else index.set(key, [w]);
    }
    anagramIndexCache.set(allWords, index);
  }
  const lower = word.toLowerCase();
  return (index.get(sortedChars(word)) ?? []).filter(
    (w) => w.wordProperties.berlinerisch.toLowerCase() !== lower,
  );
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
      germanCollator.compare(
        a.wordProperties.berlinerisch.toLowerCase(),
        b.wordProperties.berlinerisch.toLowerCase(),
      ),
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
