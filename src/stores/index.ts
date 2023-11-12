import { atom, action, map } from "nanostores";

type WordOfTheDay = {
  word?: string;
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
