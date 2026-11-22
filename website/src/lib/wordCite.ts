export type CitationFormat = "short" | "apa" | "wikipedia";

const MONTHS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

// Calendar day in Europe/Berlin, so a date near midnight does not shift with the server/client zone.
const berlin = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Europe/Berlin",
  year: "numeric",
});

const parts = (d: Date) => {
  const [year, month, day] = berlin.format(d).split("-").map(Number) as [number, number, number];
  return { day, month, year };
};

const pad = (n: number) => String(n).padStart(2, "0");

const long = (d: Date) => {
  const { year, month, day } = parts(d);
  return { day, month: MONTHS[month - 1]!, year };
};

const iso = (d: Date) => {
  const { year, month, day } = parts(d);
  return `${year}-${pad(month)}-${pad(day)}`;
};

// `|` and `=` would split/assign parameters, `{{`/`}}` would open/close templates; one pass so escapes are not re-escaped.
const wikiEscape = (s: string) =>
  s.replace(/\||=|\{\{|\}\}/g, (m) =>
    m === "|" ? "{{!}}" : m === "=" ? "{{=}}" : m === "{{" ? "&#123;&#123;" : "&#125;&#125;",
  );

export function formatCitation(
  format: CitationFormat,
  { word, url, updatedAt, today }: { word: string; url: string; updatedAt: Date; today: Date },
): string {
  if (format === "short") {
    const { year, month, day } = parts(today);
    return `„${word}“. In: Berliner Schnauze – Wörterbuch des Berlinerischen. ${url} (abgerufen am ${pad(day)}.${pad(month)}.${year}).`;
  }
  if (format === "apa") {
    const u = long(updatedAt);
    const t = long(today);
    return `Berliner Schnauze. (${u.year}, ${u.day}. ${u.month}). ${word}. Abgerufen am ${t.day}. ${t.month} ${t.year}, von ${url}`;
  }
  return `{{Internetquelle |url=${url} |titel=${wikiEscape(word)} |werk=Berliner Schnauze |datum=${iso(updatedAt)} |abruf=${iso(today)}}}`;
}
