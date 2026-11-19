// Pure range helpers of the admin stats page (no payload/next/drizzle imports).
import { addDays } from "./berlinTime";

/** Berlin days `YYYY-MM-DD`, both ends included. */
export type Range = { readonly from: string; readonly to: string };

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

const defaultRange = (today: string): Range => ({
  from: addDays(today, 1 - DEFAULT_DAYS),
  to: today,
});

/**
 * `von`/`bis` of the URL. Nothing given: the last 30 days. A `bis` in the future is cut back to today and a range over
 * 366 days loses its oldest days; anything else invalid (garbage, reversed) gives the last 30 days. `notice` says in
 * German what was changed, so the page never shows another range than the one asked for without telling.
 */
export const parseRange = (
  params: Record<string, string | string[] | undefined>,
  today: string,
): { range: Range; notice: string | null } => {
  const { von, bis } = params;
  if (von === undefined && bis === undefined) return { range: defaultRange(today), notice: null };
  const fallback = (why: string) => ({
    range: defaultRange(today),
    notice: `${why} Gezeigt werden die letzten ${DEFAULT_DAYS} Tage.`,
  });
  if (!isDay(von) || !isDay(bis)) return fallback("Der Zeitraum ist ungültig.");
  const to = bis > today ? today : bis;
  if (von > to) return fallback("„Von“ liegt nach „Bis“.");
  let range = { from: von, to };
  const notices: string[] = [];
  if (bis > today) notices.push("„Bis“ liegt in der Zukunft und wurde auf heute gesetzt.");
  if (lengthOf(range) > MAX_DAYS) {
    range = { from: addDays(to, 1 - MAX_DAYS), to };
    notices.push(`Der Zeitraum wurde auf ${MAX_DAYS} Tage gekürzt.`);
  }
  return { range, notice: notices.length ? notices.join(" ") : null };
};

/** The range of the same length directly before `range`. */
export const previousRange = (range: Range): Range => ({
  from: addDays(range.from, -lengthOf(range)),
  to: addDays(range.from, -1),
});

/** Above 90 days the chart groups by week instead of by day, so it stays readable. */
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
