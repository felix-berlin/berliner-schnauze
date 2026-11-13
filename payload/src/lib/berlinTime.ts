// Pure Berlin calendar helpers (no payload/next/drizzle imports): shared by word stats and the BON ranking.

const dayFormat = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" });

/** `YYYY-MM-DD` of the given moment in Berlin time. */
export const berlinDay = (date: Date = new Date()): string => dayFormat.format(date);

/** Calendar arithmetic on `YYYY-MM-DD` (no time zone involved). */
export const addDays = (day: string, n: number): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

/** The instant Berlin's `day` starts; tries both UTC offsets, so it survives DST changes. */
export const dayStart = (day: string): Date => {
  for (const h of [1, 2]) {
    const t = new Date(Date.parse(`${day}T00:00:00Z`) - h * 36e5);
    if (berlinDay(t) === day && berlinDay(new Date(+t - 1)) !== day) return t;
  }
  throw new Error(`no Berlin midnight for ${day}`);
};
