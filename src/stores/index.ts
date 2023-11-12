import { atom, action, map } from "nanostores";

interface Translation {
  translation: string;
}

interface Example {
  example: string;
  example_explanation: string;
}

export interface Word {
  ID: number;
  post_date: string;
  post_name: string;
  post_modified: string;
  berlinerisch: string;
  article: null | string;
  alternative_words: boolean;
  translations: Translation[];
  examples: Example[];
  related_words: null | string;
  learn_more: null | string;
  group: string;
  word_type: boolean;
  exspires: number;
}

type WordOfTheDay = {
  word?: Word;
  loading: boolean;
};

export const wordOfTheDay = map<WordOfTheDay>({
  word: "",
  loading: true,
});

/**
 * Get word of the day
 *
 * @param   {[type]}  wordOfTheDay     [wordOfTheDay description]
 * @param   {[type]}  getWordOfTheDay  [getWordOfTheDay description]
 * @param   {[type]}  async            [async description]
 * @param   {[type]}  store            [store description]
 * @param   {[type]}  add              [add description]
 *
 * @return  {[type]}                   [return description]
 */
export const getWordOfTheDay = action(wordOfTheDay, "getWordOfTheDay", async (store, add) => {
  return await fetch(`${import.meta.env.PUBLIC_WP_REST_API}/berliner-schnauze/v1/word-of-the-day`)
    .then((res) => res.json())
    .then((data) => {
      wordOfTheDay.setKey("word", data);
      wordOfTheDay.setKey("loading", false);
    })
    .catch((err) => {
      console.error(err);
    });
});
