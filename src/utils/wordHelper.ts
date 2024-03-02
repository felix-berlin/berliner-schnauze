import nlp from "de-compromise";
import natural from "natural";
import { fetchWikimediaAPI } from "@services/wikimediaApi.ts";
import type { BerlinerWord, WordPropertiesWikimediaFiles } from "@ts_types/generated/graphql.ts";

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
    vowels: vowelsCount,
    consonants: consonantsCount,
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
  Noun: "Nomen",
  Singular: "Einzahl",
  Person: "Person",
  FirstName: "Vorname",
  MaleName: "Männlicher Name",
  FemaleName: "Weiblicher Name",
  LastName: "Nachname",
  Place: "Ort",
  Country: "Land",
  City: "Stadt",
  Region: "Region",
  Address: "Adresse",
  Organization: "Organisation",
  SportsTeam: "Sportteam",
  Company: "Unternehmen",
  School: "Schule",
  ProperNoun: "Eigenname",
  Honorific: "Anrede",
  Plural: "Mehrzahl",
  Uncountable: "Unzählbar",
  Pronoun: "Pronomen",
  Actor: "Schauspieler",
  Activity: "Aktivität",
  Unit: "Einheit",
  Demonym: "Demonym",
  Possessive: "Possessivpronomen",
  Verb: "Verb",
  PresentTense: "Präsens",
  Infinitive: "Infinitiv",
  Gerund: "Gerundium",
  PastTense: "Präteritum",
  PerfectTense: "Perfekt",
  FuturePerfect: "Futur II",
  Pluperfect: "Plusquamperfekt",
  Copula: "Kopula",
  Modal: "Modalverb",
  Participle: "Partizip",
  Particle: "Partikel",
  PhrasalVerb: "Phrasalverb",
  Value: "Wert",
  Ordinal: "Ordinalzahl",
  Cardinal: "Kardinalzahl",
  RomanNumeral: "Römische Zahl",
  Multiple: "Mehrfach",
  Fraction: "Bruchzahl",
  TextValue: "Textwert",
  NumericValue: "Numerischer Wert",
  Percent: "Prozent",
  Money: "Geld",
  Date: "Datum",
  Month: "Monat",
  WeekDay: "Wochentag",
  RelativeDay: "Relativer Tag",
  Year: "Jahr",
  Duration: "Dauer",
  Time: "Zeit",
  Holiday: "Feiertag",
  Adjective: "Adjektiv",
  Comparable: "Vergleichbar",
  Comparative: "Komparativ",
  Superlative: "Superlativ",
  Contraction: "Kontraktion",
  Adverb: "Adverb",
  Currency: "Währung",
  Determiner: "Artikel",
  Conjunction: "Konjunktion",
  Preposition: "Präposition",
  QuestionWord: "Fragepronomen",
  Expression: "Ausdruck",
  Abbreviation: "Abkürzung",
  URL: "URL",
  Hashtag: "Hashtag",
  PhoneNumber: "Telefonnummer",
  AtMention: "@Erwähnung",
  Emoji: "Emoji",
  Emoticon: "Emoticon",
  Email: "E-Mail",
  Auxiliary: "Hilfsverb",
  Negative: "Negation",
  Acronym: "Akronym",
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

  const allWordsWithoutCurrent = allWords.filter((word) => word.id !== currentWord?.id);
  return allWordsWithoutCurrent.map((word) => {
    return {
      word: word,
      isSimilar: natural.SoundEx.compare(
        word.wordProperties?.berlinerisch,
        currentWord.wordProperties?.berlinerisch,
      ),
    };
  });
};

export const createWikimediaFileList = async (wikimediaFiles: WordPropertiesWikimediaFiles[]) => {
  if (!wikimediaFiles) return;

  const files = [];
  for (const file of wikimediaFiles!) {
    const img = await fetchWikimediaAPI(file?.wikimediaFile);
    files.push({ image: img, description: file?.description, caption: file?.caption });
  }
  return files;
};

export const capitalizeFirstLetter = (word: string) => {
  return word.charAt(0).toUpperCase() + word.slice(1);
};
