// Pure range helpers of the admin stats page (no payload/next/drizzle imports).
import { addDays } from "./berlinTime";

/** Berlin days `YYYY-MM-DD`, both ends included. */
export type Range = { from: string; to: string };

const MAX_DAYS = 366;
const DEFAULT_DAYS = 30;
const WEEK_ABOVE_DAYS = 90;
const MS_DAY = 864e5;

const isDay = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  new Date(Date.parse(`${value}T00:00:00Z`)).toISOString().slice(0, 10) === value; // rejects 02-30

/** Number of days in the range, both ends included. */
const lengthOf = ({ from, to }: Range): number =>
  (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_DAY + 1;

/** `von`/`bis` of the URL; anything invalid, reversed, in the future or longer than 366 days gives the last 30 days. */
export const parseRange = (
  params: Record<string, string | string[] | undefined>,
  today: string,
): Range => {
  const { von, bis } = params;
  const fallback = { from: addDays(today, 1 - DEFAULT_DAYS), to: today };
  if (!isDay(von) || !isDay(bis) || von > bis || bis > today) return fallback;
  const range = { from: von, to: bis };
  return lengthOf(range) > MAX_DAYS ? fallback : range;
};

/** The range of the same length directly before `range`. */
export const previousRange = (range: Range): Range => ({
  from: addDays(range.from, -lengthOf(range)),
  to: addDays(range.from, -1),
});

/** Weeks above 90 days keep the chart readable. */
export const bucketMode = (range: Range): "day" | "week" =>
  lengthOf(range) > WEEK_ABOVE_DAYS ? "week" : "day";

/** The bucket a day belongs to: itself, or the Monday of its ISO week (never before the range starts). */
export const bucketKey = (day: string, mode: "day" | "week", range: Range): string => {
  if (mode === "day") return day;
  const sinceMonday = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
  const monday = addDays(day, -sinceMonday);
  return monday < range.from ? range.from : monday;
};

/** Change in whole percent; "neu" when there was nothing before, "–" when there is nothing at all. */
export const pctChange = (current: number, previous: number): number | "neu" | "–" =>
  previous === 0
    ? current > 0
      ? "neu"
      : "–"
    : Math.round(((current - previous) / previous) * 100);
