// Client-safe (no astro:env): shared by the server day logic and browser-side formatting.
export const BERLIN = "Europe/Berlin";

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

export const berlinNumbers = (date: Date) =>
  Object.fromEntries(Object.entries(berlinParts(date)).map(([k, v]) => [k, Number(v)])) as Record<
    keyof ReturnType<typeof berlinParts>,
    number
  >;

/** The Berlin calendar day as `YYYY-MM-DD`. */
export const berlinDayKey = (date: Date): string => {
  const { year, month, day } = berlinParts(date);
  return `${year}-${month}-${day}`;
};
