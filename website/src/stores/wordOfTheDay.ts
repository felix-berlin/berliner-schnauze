import { persistentMap } from "@nanostores/persistent";
import { jsonCodec } from "@utils/jsonCodec";
import { onMount, task } from "nanostores";

/** The body of /api/word-of-the-day (`toWordOfTheDayResponse`). */
export interface Word {
  berlinerisch?: string;
  /** Seconds until Berlin midnight at render time (the proxy cache lifetime). */
  expires?: number;
  /** Berlin midnight in epoch ms: when the word runs out. */
  expiresAt?: number;
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
  try {
    // no-cache: the browser must revalidate, never hand back yesterday's copy from stale-while-revalidate.
    const res = await fetch("/api/word-of-the-day", { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Word;
    // Only a parsed word moves the timestamp: a broken body must not refresh the old word's lifetime.
    $wordOfTheDay.setKey("timestamp", Date.now());
    $wordOfTheDay.setKey("error", false);
    $wordOfTheDay.setKey("word", data);
  } catch (err) {
    $wordOfTheDay.setKey("error", true);
    console.error("Failed to fetch Word of the Day: ", err);
  } finally {
    $wordOfTheDay.setKey("loading", false);
  }
};

/** When the cached word runs out (Berlin midnight, from the server); a word cached in an older shape has run out. */
export const expiresAt = ({ word }: Pick<WordOfTheDay, "word">): number => word?.expiresAt ?? 0;

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
  // Server-rendered subscribers (e.g. IsWordOfTheDay in SingleWord.vue) would otherwise
  // fire this fetch on every server render.
  if (import.meta.env.SSR) return;

  void task(async () => {
    // A word cached in an older shape has no slug or expiry: fetch it again.
    const word = readPersisted<Word>("word", {});
    if (word.slug && Date.now() < expiresAt({ word })) return;

    // getWordOfTheDay() handles its own errors and never rejects.
    await getWordOfTheDay();
  });
});
