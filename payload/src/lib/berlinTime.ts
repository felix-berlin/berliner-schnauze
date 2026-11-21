// Pure Berlin calendar helpers (no payload/next/drizzle imports): shared by word stats and the BON ranking.

const dayFormat = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" });

/** `YYYY-MM-DD` of the given moment in Berlin time. */
export const berlinDay = (date: Date = new Date()): string => dayFormat.format(date);

/** Calendar arithmetic on `YYYY-MM-DD` (no time zone involved). */
export const addDays = (day: string, n: number): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

/** True for a real calendar day written `YYYY-MM-DD` (rejects 02-30). */
export const isDay = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value;
};

/** Days from `from` to `to` (negative when `to` is earlier). */
export const daysBetween = (from: string, to: string): number =>
  (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 864e5;

/** The Monday of the ISO week `day` belongs to (`day` itself on a Monday). */
export const mondayOf = (day: string): string =>
  addDays(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7));

/** The instant Berlin's `day` starts; tries both UTC offsets, so it survives DST changes. */
export const dayStart = (day: string): Date => {
  for (const h of [1, 2]) {
    const t = new Date(Date.parse(`${day}T00:00:00Z`) - h * 36e5);
    if (berlinDay(t) === day && berlinDay(new Date(+t - 1)) !== day) return t;
  }
  throw new Error(`no Berlin midnight for ${day}`);
};
