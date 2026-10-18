import {
  pickWordOfTheDay,
  secondsUntilBerlinMidnight,
  toWordOfTheDayResponse,
} from "@utils/wordOfTheDay.ts";
import { describe, expect, it } from "vitest";

const words = ["wa", "aasen", "bulette", "icke", "kiez"].map((slug) => ({ slug }));

describe("pickWordOfTheDay", () => {
  it("returns the same word at any time of one Berlin day", () => {
    // 2026-10-16 00:30 and 23:30 in Berlin (UTC+2)
    const early = pickWordOfTheDay(words, new Date("2026-10-15T22:30:00Z"));
    const late = pickWordOfTheDay(words, new Date("2026-10-16T21:30:00Z"));
    expect(early).toBeDefined();
    expect(late).toBe(early);
  });

  it("returns a different word the next day and cycles through all words", () => {
    const seen = new Set<string>();
    for (let day = 0; day < words.length; day++) {
      seen.add(pickWordOfTheDay(words, new Date(Date.UTC(2026, 9, 16 + day, 12)))!.slug);
    }
    expect(seen.size).toBe(words.length);
  });

  it("does not depend on the order of the input", () => {
    const date = new Date("2026-10-16T12:00:00Z");
    expect(pickWordOfTheDay([...words].reverse(), date)).toEqual(pickWordOfTheDay(words, date));
  });

  it("returns undefined without words", () => {
    expect(pickWordOfTheDay([], new Date())).toBeUndefined();
  });
});

describe("secondsUntilBerlinMidnight", () => {
  it("counts down to the next Berlin midnight", () => {
    // 21:00 UTC = 23:00 Berlin (summer time): one hour left
    expect(secondsUntilBerlinMidnight(new Date("2026-10-16T21:00:00Z"))).toBe(3600);
    // 22:30 UTC = 00:30 Berlin: 23.5 hours left
    expect(secondsUntilBerlinMidnight(new Date("2026-10-16T22:30:00Z"))).toBe(23.5 * 3600);
  });
});

describe("toWordOfTheDayResponse", () => {
  it("answers what the store reads: headword, slug and the seconds until Berlin midnight", () => {
    expect(
      toWordOfTheDayResponse(
        { berlinerisch: "Schrapen", slug: "schrapen" },
        new Date("2026-10-16T21:00:00Z"),
      ),
    ).toEqual({ berlinerisch: "Schrapen", expires: 3600, slug: "schrapen" });
  });
});
