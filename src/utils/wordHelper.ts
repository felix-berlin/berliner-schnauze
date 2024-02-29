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

export const translateNlpTags = (tags: WordTags[]): WordTags[] => {
  const tagTranslations: TagTranslations = {
    Noun: "Nomen",
    Singular: "Einzahl",
    Plural: "Mehrzahl",
    Verb: "Verb",
    Adjective: "Adjektiv",
    ProperNoun: "Eigenname",
    Pronoun: "Pronomen",
    Determiner: "Artikel",
    Adverb: "Adverb",
    Conjunction: "Konjunktion",
    Preposition: "Präposition",
    Interjection: "Interjektion",
    Auxiliary: "Hilfsverb",
    Negative: "Negation",
    Particle: "Partikel",
    Possessive: "Possessivpronomen",
    QuestionWord: "Fragepronomen",
    Date: "Datum",
    Time: "Zeit",
    Value: "Wert",
    Phone: "Telefon",
    Email: "E-Mail",
    URL: "URL",
    Hashtag: "Hashtag",
    Emoji: "Emoji",
    Emoticon: "Emoticon",
    Acronym: "Akronym",
    Abbreviation: "Abkürzung",
    Honorific: "Anrede",
    Actor: "Schauspieler",
    PresentTense: "Präsens",
    Infinitive: "Infinitiv",
    NeuterNoun: "Neutrum",
  };

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
