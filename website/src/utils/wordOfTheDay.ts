import type { Word } from "@/types/cms.ts";

const BERLIN = "Europe/Berlin";

const berlinFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "2-digit",
  second: "2-digit",
  timeZone: BERLIN,
  year: "numeric",
});

/** Y/M/D and time of day in Berlin, zero-padded: the day flips at local midnight, like the visitors' own clock. */
export const berlinParts = (date: Date) =>
  Object.fromEntries(berlinFormat.formatToParts(date).map((p) => [p.type, p.value])) as Record<
    "day" | "hour" | "minute" | "month" | "second" | "year",
    string
  >;

const berlinNumbers = (date: Date) =>
  Object.fromEntries(Object.entries(berlinParts(date)).map(([k, v]) => [k, Number(v)])) as Record<
    keyof ReturnType<typeof berlinParts>,
    number
  >;

const MS_PER_DAY = 86_400_000;

// The words array is memoized per cache window: sort each one once, not per request.
const bySlug = new WeakMap<object[], object[]>();

/** One word per Berlin day, the same for every visitor and request: slugs sorted, indexed by the day number. */
export const pickWordOfTheDay = <T extends { slug: string }>(
  words: T[],
  date: Date,
): T | undefined => {
  if (words.length === 0) return undefined;
  const { day, month, year } = berlinNumbers(date);
  const dayNumber = Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY);
  let sorted = bySlug.get(words) as T[] | undefined;
  if (!sorted) {
    sorted = [...words].sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
    bySlug.set(words, sorted);
  }
  return sorted[dayNumber % words.length];
};

// ponytail: ignores the 23/25 hour days around the clock change (an hour of slack in the cache lifetime only).
export const secondsUntilBerlinMidnight = (date: Date): number => {
  const { hour, minute, second } = berlinNumbers(date);
  return 86_400 - (hour * 3600 + minute * 60 + second);
};

/** The shape of the former WordPress endpoint, which the nanostore and its components still read. */
export const toWordOfTheDayResponse = (word: Word, now: Date) => ({
  ID: word.berlinerWordId,
  alternative_words: word.wordProperties.alternativeWords?.length ? true : null,
  article: word.wordProperties.article,
  berlinerisch: word.wordProperties.berlinerisch,
  examples:
    word.wordProperties.examples?.map((e) => ({
      example: e.example,
      example_explanation: e.exampleExplanation,
    })) ?? null,
  expires: secondsUntilBerlinMidnight(now),
  group: word.wordGroup,
  learn_more: word.wordProperties.learnMore,
  post_date: word.dateGmt?.replace("T", " ") ?? null,
  post_modified: word.modifiedGmt?.replace("T", " ") ?? null,
  post_name: word.slug,
  related_words: word.wordProperties.relatedWords?.nodes.length ? true : null,
  translations: word.translations.map((translation) => ({ translation })),
  word_type: false,
});
