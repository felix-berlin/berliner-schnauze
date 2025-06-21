import { fetchWikimediaAPI } from "@services/wikimediaApi.ts";
import nlp from "de-compromise";
import natural from "natural";

import type { BerlinerWord, WordPropertiesWikimediaFiles } from "@/gql/graphql.ts";

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
  Uncountable: "Unzählbar",
  Unit: "Einheit",
  URL: "URL",
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

export const similarSoundingWords = (allWords: BerlinerWord[], currentWord: BerlinerWord) => {
  if (!currentWord || !allWords) {
    return [];
  }

  const SoundEx = natural.SoundEx;

  const allWordsWithoutCurrent = allWords.filter((word) => word.id !== currentWord?.id);
  return allWordsWithoutCurrent.map((word) => {
    const currentBerlinerisch = currentWord.wordProperties?.berlinerisch;
    const wordBerlinerisch = word.wordProperties?.berlinerisch;

    const isSimilar =
      currentBerlinerisch && wordBerlinerisch
        ? new SoundEx().compare(wordBerlinerisch, currentBerlinerisch)
        : false;

    return {
      isSimilar: isSimilar,
      word: word,
    };
  });
};

export const similarWords = (
  allWords: BerlinerWord[],
  currentWord: BerlinerWord,
  needsSimilarity?: number,
) => {
  if (!currentWord || !allWords) {
    return [];
  }

  const allWordsWithoutCurrent = allWords.filter((word) => word.id !== currentWord?.id);
  const similarWords = allWordsWithoutCurrent.map((word) => {
    return {
      isSimilar: natural.JaroWinklerDistance(
        word.wordProperties.berlinerisch,
        currentWord.wordProperties?.berlinerisch,
        false,
      ),
      word: word,
    };
  });

  if (needsSimilarity) return similarWords.filter((word) => word.isSimilar >= needsSimilarity);

  return similarWords;
};

export const createWikimediaFileList = async (wikimediaFiles: WordPropertiesWikimediaFiles[]) => {
  if (!wikimediaFiles) return;

  const files = [];
  for (const file of wikimediaFiles) {
    const img = await fetchWikimediaAPI(file?.wikimediaFile);
    files.push({ caption: file?.caption, description: file?.description, image: img });
  }
  return files;
};

export const capitalizeFirstLetter = (word: string) => {
  return word.charAt(0).toUpperCase() + word.slice(1);
};
