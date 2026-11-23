import type { SiteWord } from "@services/payload/words.ts";

import { isE2eServer } from "@utils/e2eServer.ts";

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

/**
 * Fixed day of the e2e server (noon, so the Berlin day is the same in every zone). Coupled to the e2e seed:
 * it has exactly 28 words and abjang must stay at sorted index 4 (see payload/src/seed/e2e.ts).
 */
export const E2E_PINNED_DAY = new Date("2026-01-19T12:00:00Z");

const MS_PER_DAY = 86_400_000;

// The words array is memoized per cache window: sort each one once, not per request.
const bySlug = new WeakMap<object[], object[]>();

/** One word per Berlin day, the same for every visitor and request: slugs sorted, indexed by the day number. */
export const pickWordOfTheDay = <T extends { slug: string }>(
  words: T[],
  date: Date,
  pinned = isE2eServer(),
): T | undefined => {
  if (words.length === 0) return undefined;
  // The e2e server pins the day, so screenshots do not depend on the daily word (never true in production).
  const { day, month, year } = berlinNumbers(pinned ? E2E_PINNED_DAY : date);
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

/** What the nanostore and its components read; the store refetches a cached word without a slug (older shape). */
export const toWordOfTheDayResponse = (
  word: Pick<SiteWord, "berlinerisch" | "slug">,
  now: Date,
) => ({
  berlinerisch: word.berlinerisch,
  expires: secondsUntilBerlinMidnight(now),
  // Absolute, so a copy served stale from a cache still runs out at that midnight, not later.
  expiresAt: now.getTime() + secondsUntilBerlinMidnight(now) * 1000,
  slug: word.slug,
});
