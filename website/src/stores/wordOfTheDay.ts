import { persistentMap } from "@nanostores/persistent";
import { jsonCodec } from "@utils/jsonCodec";
import { onMount, task } from "nanostores";

/** The body of /api/word-of-the-day (`toWordOfTheDayResponse`). */
export interface Word {
  berlinerisch?: string;
  expires?: number;
  slug?: string;
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
  jsonCodec,
);

/**
 * Get word of the day
 * @return {Promise<void>}
 */
export const getWordOfTheDay = async (): Promise<void> => {
  return await fetch("/api/word-of-the-day")
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

// nanostores onMount callbacks run in reverse registration order (reduceRight),
// so persistentMap's restore() hasn't populated the store yet when our callback runs.
// Read directly from localStorage using the persistentMap key format.
const readPersisted = <T>(key: keyof WordOfTheDay, fallback: T): T => {
  try {
    const raw = localStorage.getItem(`wordOfTheDay:${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

onMount($wordOfTheDay, () => {
  // Server-rendered subscribers (e.g. IsWordOfTheDay in WordHero.astro) would otherwise
  // fire this fetch once per page during the build.
  if (import.meta.env.SSR) return;

  void task(async () => {
    const timestamp = readPersisted("timestamp", 0);
    // A word cached in the former WordPress shape has no slug: fetch it again.
    const cachedSlug = readPersisted<Word>("word", {}).slug;
    if (timestamp && isCachedToday(timestamp) && cachedSlug) return;

    // getWordOfTheDay() handles its own errors and never rejects.
    await getWordOfTheDay();
  });
});
