import { onMount, task } from "nanostores";
import { persistentMap } from "@nanostores/persistent";
import { WP_REST_API, WP_AUTH_REFRESH_TOKEN } from "astro:env/client";

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
  expires?: number;
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
  return await fetch(`${WP_REST_API}/berliner-schnauze/v1/word-of-the-day`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${WP_AUTH_REFRESH_TOKEN}`,
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

onMount($wordOfTheDay, async () => {
  await task(async () => {
    await getWordOfTheDay().catch((err) => {
      console.error("Failed to fetch Word of the Day: ", err);
    });
  });
});
