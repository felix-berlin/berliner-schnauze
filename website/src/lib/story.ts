import type { Comment } from "payload-app";

/** Exactly the districts of `STORY_BEZIRKE` (payload-types derives the union from the same list). */
export type StoryBezirk = NonNullable<Comment["bezirk"]>;

/** A Jeschichte as the browser sees it; per-visitor data (own reaction) is never part of it. */
export type Story = {
  id: string;
  text: string;
  /** `authorName` only; empty means "aus der Community". Returned as stored, views escape. */
  name?: string;
  bezirk?: StoryBezirk;
  createdAt: string;
  /** Upvotes ("Jenau!") */
  jenau: number;
  /** Downvotes ("Kenn ick anders") */
  anders: number;
};

const MINUTE = 60_000;
const UNITS = [
  ["year", 365 * 24 * 60 * MINUTE],
  ["month", 30 * 24 * 60 * MINUTE],
  ["week", 7 * 24 * 60 * MINUTE],
  ["day", 24 * 60 * MINUTE],
  ["hour", 60 * MINUTE],
  ["minute", MINUTE],
] as const;
const rtf = new Intl.RelativeTimeFormat("de", { numeric: "always" });

/** „vor 3 Tagen“ (never finer than a minute, so a fresh story reads „vor 1 Minute“). */
export const agoLabel = (iso: string, now = Date.now()): string => {
  const age = Math.max(0, now - new Date(iso).getTime());
  const [unit, size] = UNITS.find(([, ms]) => age >= ms) ?? UNITS[UNITS.length - 1]!;
  return rtf.format(-Math.max(1, Math.floor(age / size)), unit);
};
