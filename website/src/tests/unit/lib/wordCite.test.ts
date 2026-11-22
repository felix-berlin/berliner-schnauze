import { describe, expect, it } from "vitest";

import { formatCitation } from "@/lib/wordCite";

const url = "https://example.org/wort/beispielwort";
const base = {
  today: new Date("2026-11-22T12:00:00Z"),
  updatedAt: new Date("2026-01-05T12:00:00Z"),
  url,
  word: "Beispielwort",
};

describe("formatCitation", () => {
  it("formats the short citation", () => {
    expect(formatCitation("short", base)).toBe(
      `„Beispielwort“. In: Berliner Schnauze – Wörterbuch des Berlinerischen. ${url} (abgerufen am 22.11.2026).`,
    );
  });

  it("formats APA with the update date in parentheses and the retrieval date", () => {
    expect(formatCitation("apa", base)).toBe(
      `Berliner Schnauze. (2026, 5. Januar). Beispielwort. Abgerufen am 22. November 2026, von ${url}`,
    );
  });

  it("formats the Wikipedia template with ISO dates", () => {
    expect(formatCitation("wikipedia", base)).toBe(
      `{{Internetquelle |url=${url} |titel=Beispielwort |werk=Berliner Schnauze |datum=2026-01-05 |abruf=2026-11-22}}`,
    );
  });

  it("prints Dezember", () => {
    const out = formatCitation("apa", { ...base, today: new Date("2026-12-24T12:00:00Z") });
    expect(out).toContain("Abgerufen am 24. Dezember 2026");
  });

  it("escapes | and }} in the Wikipedia title", () => {
    const out = formatCitation("wikipedia", { ...base, word: "A|B}}" });
    expect(out).toContain("|titel=A{{!}}B&#125;&#125; |werk=");
    expect(out.endsWith("|abruf=2026-11-22}}")).toBe(true);
    // only the template's own braces and the {{!}} escape remain
    expect(out.match(/\}\}/g)).toHaveLength(2);
  });

  it("neutralises {{ and = in the Wikipedia title", () => {
    const out = formatCitation("wikipedia", { ...base, word: "a{{b=c" });
    expect(out).toContain("|titel=a&#123;&#123;b{{=}}c |werk=");
  });

  it("uses the Berlin calendar day near midnight", () => {
    // 23:30 UTC on 21 Nov is already 22 Nov in Berlin (UTC+1)
    const out = formatCitation("short", { ...base, today: new Date("2026-11-21T23:30:00Z") });
    expect(out).toContain("(abgerufen am 22.11.2026)");
    // 23:30 UTC in summer is 01:30 next day in Berlin (UTC+2)
    const summer = formatCitation("wikipedia", {
      ...base,
      updatedAt: new Date("2026-06-30T23:30:00Z"),
    });
    expect(summer).toContain("|datum=2026-07-01 ");
  });
});
