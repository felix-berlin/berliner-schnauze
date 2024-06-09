import { onMount, task } from "nanostores";
import { persistentMap } from "@nanostores/persistent";

interface Translation {
  translation: string;
}
interface Example {
  example: string;
  example_explanation: string;
}

export interface Word {
  ID?: number;
  post_date?: string;
  post_name?: string;
  post_modified?: string;
  berlinerisch?: string;
  article?: null | string;
  alternative_words?: boolean;
  translations?: Translation[];
  examples?: Example[];
  related_words?: null | string;
  learn_more?: null | string;
  group?: string;
  word_type?: boolean;
  exspires?: number;
}

type WordOfTheDay = {
  word?: Word;
  loading: boolean;
  error: boolean;
  timestamp: number;
};

export const $wordOfTheDay = persistentMap<WordOfTheDay>(
  "wordOfTheDay:",
  {
    word: {},
    loading: true,
    error: false,
    timestamp: 0,
  },
  {
    encode: (value) => JSON.stringify(value),
    decode(value) {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    },
  },
);

/**
 * Get word of the day
 * @return {Promise<void>}
 */
export const getWordOfTheDay = async (): Promise<void> => {
  return await fetch(`${import.meta.env.PUBLIC_WP_REST_API}/berliner-schnauze/v1/word-of-the-day`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.PUBLIC_WP_AUTH_REFRESH_TOKEN}`,
    },
  })
    .then((res) => {
      if (!res.ok) {
        $wordOfTheDay.setKey("error", true);

        throw new Error("Failed to fetch Word of the Day");
      }

      const timeOfFetch = new Date().getTime();
      $wordOfTheDay.setKey("timestamp", timeOfFetch);

      return res.json();
    })
    .then((data) => {
      $wordOfTheDay.setKey("word", data);
      $wordOfTheDay.setKey("loading", false);
    })
    .catch((err) => {
      console.error("Failed to fetch Word of the Day: ", err);
    });
};

onMount($wordOfTheDay, () => {
  task(async () => {
    await getWordOfTheDay().catch((err) => {
      console.error("Failed to fetch Word of the Day: ", err);
    });
  });
});
