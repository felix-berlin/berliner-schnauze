import { BERLIN, berlinNumbers } from "@utils/berlinTime.ts";

export type CitationFormat = "short" | "apa" | "wikipedia";

const parts = berlinNumbers;

const pad = (n: number) => String(n).padStart(2, "0");

const long = (d: Date) => {
  const { year, day } = parts(d);
  return { day, month: d.toLocaleString("de-DE", { month: "long", timeZone: BERLIN }), year };
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
