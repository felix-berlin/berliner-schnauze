type Unit = [Intl.RelativeTimeFormatUnit, number];

const DAY = 86_400;
// Coarse (start page lists): weeks for 7-29 days, nothing below a day ("heute").
const COARSE: Unit[] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 7 * DAY],
  ["day", DAY],
];
// Precise (comments): minutes and hours, no weeks.
const PRECISE: Unit[] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["day", DAY],
  ["hour", 3600],
  ["minute", 60],
];
const formats = {
  always: new Intl.RelativeTimeFormat("de", { numeric: "always" }),
  auto: new Intl.RelativeTimeFormat("de", { numeric: "auto" }),
};

/** German relative time, e.g. „vor 2 Tagen“, „vor 1 Woche“; below a day „heute“ (precise: „jetzt“, „vor 2 Stunden“). */
export function relativeTime(
  date: Date,
  now: Date = new Date(),
  { numeric = "always", precise = false }: { numeric?: "always" | "auto"; precise?: boolean } = {},
): string {
  const seconds = (date.getTime() - now.getTime()) / 1000;
  const [unit, size] = (precise ? PRECISE : COARSE).find(([, s]) => Math.abs(seconds) >= s) ?? [
    "second",
    1,
  ];
  if (unit === "second" && !precise) return "heute";
  return formats[numeric].format(unit === "second" ? 0 : Math.round(seconds / size), unit);
}
