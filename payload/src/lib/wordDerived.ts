// Pure word helpers shared by the Payload `words` beforeChange hook and the Astro app
// (imported there via `payload-app/word-derived`). No payload/next/config imports here.
import nlp from "de-compromise";
import german from "hyphenation.de";
import Hypher from "hypher";
// ponytail: deep import of natural's SoundEx (the class `natural.SoundEx` re-exports). Loading natural's
// index in-process breaks Prettier's TS parser, which `payload generate:types` needs. Re-check the path on natural bumps.
import SoundEx from "natural/lib/natural/phonetics/soundex.js";

export const hypher = new Hypher(german);

export const VOWELS = new Set(["a", "e", "i", "o", "u", "ä", "ö", "ü"]);
export const LETTER_RE = /[a-zäöüß]/i;

/** Expects a lowercase char. */
export const isVowelChar = (c: string): boolean => VOWELS.has(c);
/** Expects a lowercase char. */
export const isConsonantChar = (c: string): boolean => LETTER_RE.test(c) && !isVowelChar(c);

const _soundEx = new SoundEx();

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

export type WordTags = {
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

// Suffix sub-tokens enable compound word search: "Pinsel" finds "Bierpinsel".
// Orama does prefix matching natively; this covers the suffix (head-word) side.
export function getWordComponents(word: string, minLen = 4): string[] {
  const parts = word
    .toLowerCase()
    .replace(/[^a-zäöüß]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const suffixes = new Set<string>();
  for (const part of parts) {
    for (let i = 1; i <= part.length - minLen; i++) {
      suffixes.add(part.slice(i));
    }
  }
  return [...suffixes];
}

export const soundexCode = (word: string): string => (word ? _soundEx.process(word) : "");

export const wordGroupOf = (word: string): string => {
  const first = [...word][0] ?? "";
  return /\p{L}/u.test(first) ? first.toUpperCase() : "";
};

export type DerivedWordFields = {
  wordGroup: string;
  characterLength: number;
  syllablesCount: number;
  consonantsCount: number;
  vowelsCount: number;
  nlpTags: WordTags[];
  wordComponents: string[];
  soundexCode: string;
};

export const deriveWordFields = (berlinerisch: string): DerivedWordFields => {
  const { consonants, vowels } = countLetters(berlinerisch);
  return {
    wordGroup: wordGroupOf(berlinerisch),
    characterLength: berlinerisch.length,
    syllablesCount: berlinerisch ? hypher.hyphenate(berlinerisch).length : 0,
    consonantsCount: consonants,
    vowelsCount: vowels,
    nlpTags: translateNlpTags(getWordType(berlinerisch)),
    wordComponents: getWordComponents(berlinerisch),
    soundexCode: soundexCode(berlinerisch),
  };
};
