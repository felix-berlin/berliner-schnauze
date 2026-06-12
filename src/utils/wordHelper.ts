import { fetchWikimediaAPI } from "@services/wikimediaApi.ts";
import germanWordsArray from "all-the-german-words";
import nlp from "de-compromise";
import natural from "natural";

import type { WordPropertiesWikimediaFiles } from "@/gql/entity-types";

export type WordRef = {
  id?: string | null;
  slug?: string | null;
  wordProperties?: { berlinerisch?: string | null } | null;
};

export const germanWords = new Set<string>(
  (germanWordsArray as string[]).map((w) => w.toLowerCase()),
);

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
    if ("aeiouäöü".includes(char.toLowerCase())) {
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

  for (const char of word) {
    if ("aeiouäöü".includes(char.toLowerCase())) {
      vowelsCount++;
    } else if (char.match(/[a-zäöüß]/i)) {
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

export const similarSoundingWords = (allWords: WordRef[], currentWord: WordRef) => {
  if (!currentWord || !allWords) {
    return [];
  }

  const allWordsWithoutCurrent = allWords.filter((word) => word.id !== currentWord?.id);
  return allWordsWithoutCurrent.map((word) => {
    const currentBerlinerisch = currentWord.wordProperties?.berlinerisch;
    const wordBerlinerisch = word.wordProperties?.berlinerisch;

    const isSimilar =
      currentBerlinerisch && wordBerlinerisch
        ? _soundEx.compare(wordBerlinerisch, currentBerlinerisch)
        : false;

    return {
      isSimilar: isSimilar,
      word: word,
    };
  });
};

export const similarWords = (
  allWords: WordRef[],
  currentWord: WordRef,
  needsSimilarity?: number,
) => {
  if (!currentWord || !allWords) {
    return [];
  }

  const allWordsWithoutCurrent = allWords.filter((word) => word.id !== currentWord?.id);
  const similarWords = allWordsWithoutCurrent.map((word) => {
    return {
      isSimilar: natural.JaroWinklerDistance(
        word.wordProperties?.berlinerisch ?? "",
        currentWord.wordProperties?.berlinerisch ?? "",
      ),
      word: word,
    };
  });

  if (needsSimilarity !== undefined) return similarWords.filter((word) => word.isSimilar >= needsSimilarity);

  return similarWords;
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
      isVowel: "aeiouäöü".includes(char),
      label: frequencyLabel(GERMAN_LETTER_FREQ[char]!),
      percent: GERMAN_LETTER_FREQ[char]!,
    }));
};

const VOWELS_SET = new Set(["a", "e", "i", "o", "u", "ä", "ö", "ü"]);
const ALL_GERMAN_VOWELS = ["a", "e", "i", "o", "u", "ä", "ö", "ü"];

const isVowelChar = (c: string): boolean => VOWELS_SET.has(c);
const isConsonantChar = (c: string): boolean => /[a-zäöüß]/i.test(c) && !isVowelChar(c);

export const wordCuriosities = (
  word: string,
): {
  isPalindrome: boolean;
  hasAllVowels: boolean;
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
  const letters = lower.split("").filter((c) => /[a-zäöüß]/i.test(c));

  const isPalindrome = lower === lower.split("").reverse().join("");
  const hasAllVowels = ALL_GERMAN_VOWELS.every((v) => lower.includes(v));

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
    if (lower[i] === lower[i + 1] && /[a-zäöüß]/i.test(lower[i])) {
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
    distinctVowelCount: ALL_GERMAN_VOWELS.filter((v) => lower.includes(v)).length,
    doubleLetters: [...doubleLettersSet],
    endsWithConsonant: isConsonantChar(lower[lower.length - 1] ?? ""),
    hasAllVowels,
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

export const findAnagrams = (word: string, allWords: WordRef[]): WordRef[] => {
  const target = sortedChars(word);
  return allWords.filter((w) => {
    const berlinerisch = w.wordProperties?.berlinerisch ?? "";
    return (
      berlinerisch.toLowerCase() !== word.toLowerCase() && sortedChars(berlinerisch) === target
    );
  });
};

export const alphabeticNeighbors = (
  allWords: WordRef[],
  currentWord: WordRef,
  n: number = 3,
): { before: WordRef[]; after: WordRef[] } => {
  const sorted = [...allWords].sort((a, b) =>
    (a.wordProperties?.berlinerisch ?? "")
      .toLowerCase()
      .localeCompare((b.wordProperties?.berlinerisch ?? "").toLowerCase(), "de"),
  );
  const idx = sorted.findIndex((w) => w.id === currentWord.id);
  if (idx === -1) return { after: [], before: [] };
  return {
    after: sorted.slice(idx + 1, idx + 1 + n),
    before: sorted.slice(Math.max(0, idx - n), idx).reverse(),
  };
};

export const decomposeCompoundWord = (word: string, germanWords: Set<string>): string[] | null => {
  const lower = word.toLowerCase();
  if (lower.length < 5) return null; // Too short to be a compound
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
