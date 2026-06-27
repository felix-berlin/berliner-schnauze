import { persistentMap } from "@nanostores/persistent";
import { WP_REST_API } from "astro:env/client";
import { onMount, task } from "nanostores";

export interface Word {
  alternative_words?: boolean;
  article?: null | string;
  berlinerisch?: string;
  examples?: Example[];
  expires?: number;
  group?: string;
  ID?: number;
  learn_more?: null | string;
  post_date?: string;
  post_modified?: string;
  post_name?: string;
  related_words?: null | string;
  translations?: Translation[];
  word_type?: boolean;
}
interface Example {
  example: string;
  example_explanation: string;
}

interface Translation {
  translation: string;
}

type WordOfTheDay = {
  error: boolean;
  loading: boolean;
  timestamp: number;
  word?: Word;
};

export const $wordOfTheDay = persistentMap<WordOfTheDay>(
  "wordOfTheDay:",
  {
    error: false,
    loading: true,
    timestamp: 0,
    word: {},
  },
  {
    decode(value) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    },
    encode: (value) => JSON.stringify(value),
  },
);

/**
 * Get word of the day
 * @return {Promise<void>}
 */
export const getWordOfTheDay = async (): Promise<void> => {
  return await fetch(`${WP_REST_API}/berliner-schnauze/v1/word-of-the-day`)
    .then((res) => {
      if (!res.ok) {
        $wordOfTheDay.setKey("error", true);
        $wordOfTheDay.setKey("loading", false);

        throw new Error("Failed to fetch Word of the Day");
      }

      const timeOfFetch = new Date().getTime();
      $wordOfTheDay.setKey("timestamp", timeOfFetch);

      return res.json();
    })
    .then((data) => {
      $wordOfTheDay.setKey("error", false);
      $wordOfTheDay.setKey("word", data);
      $wordOfTheDay.setKey("loading", false);
    })
    .catch((err) => {
      $wordOfTheDay.setKey("error", true);
      $wordOfTheDay.setKey("loading", false);

      console.error("Failed to fetch Word of the Day: ", err);
    });
};

const isCachedToday = (timestamp: number): boolean => {
  const cached = new Date(timestamp);
  const now = new Date();
  return (
    cached.getFullYear() === now.getFullYear() &&
    cached.getMonth() === now.getMonth() &&
    cached.getDate() === now.getDate()
  );
};

const getPersistedTimestamp = (): number => {
  // nanostores onMount callbacks run in reverse registration order (reduceRight),
  // so persistentMap's restore() hasn't populated the store yet when our callback runs.
  // Read directly from localStorage using the persistentMap key format.
  try {
    const raw = localStorage.getItem("wordOfTheDay:timestamp");
    return raw ? (JSON.parse(raw) as number) : 0;
  } catch {
    return 0;
  }
};

onMount($wordOfTheDay, () => {
  void task(async () => {
    const timestamp = getPersistedTimestamp();
    if (timestamp && isCachedToday(timestamp)) return;

    await getWordOfTheDay().catch((err) => {
      console.error("Failed to fetch Word of the Day: ", err);
    });
  });
});
