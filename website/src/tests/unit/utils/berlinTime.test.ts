import { formatCitation } from "@lib/wordCite.ts";
import { berlinDayKey, berlinNumbers, berlinParts } from "@utils/berlinTime.ts";
import { describe, expect, it } from "vitest";

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

describe("berlinTime", () => {
  it("flips the day at Berlin midnight", () => {
    expect(berlinDayKey(new Date("2026-06-30T21:59:59Z"))).toBe("2026-06-30");
    expect(berlinDayKey(new Date("2026-06-30T22:00:00Z"))).toBe("2026-07-01");
    expect(berlinDayKey(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
  });
  it("pads parts and converts numbers", () => {
    const d = new Date("2026-01-05T08:07:09Z");
    expect(berlinParts(d)).toMatchObject({ day: "05", hour: "09", minute: "07", month: "01" });
    expect(berlinNumbers(d)).toMatchObject({ day: 5, month: 1, year: 2026 });
  });
  it("names all 12 months in German like the old table (APA citation)", () => {
    MONTHS.forEach((m, i) => {
      const d = new Date(Date.UTC(2026, i, 15, 12));
      expect(formatCitation("apa", { today: d, updatedAt: d, url: "u", word: "w" })).toContain(
        `15. ${m}`,
      );
    });
  });
});
