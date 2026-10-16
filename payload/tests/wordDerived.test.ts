import natural from "natural";
import { describe, expect, it } from "vitest";

import { deriveWordFields, soundexCode, wordGroupOf } from "../src/lib/wordDerived";
import expected from "./fixtures/wordDerived.expected.json";

it.each([
  ["aasen", "A"],
  ["Ärger", "Ä"],
  ["08/15", ""],
  ["", ""],
])("wordGroupOf(%s) = %s", (w, g) => expect(wordGroupOf(w)).toBe(g));

it("derives fields for a multi-word headword", () => {
  const d = deriveWordFields("Ballast der Republik");
  expect(d.characterLength).toBe(20);
  expect(d.wordComponents).toContain("publik");
  expect(d.soundexCode).toBe(soundexCode("Ballast der Republik"));
});

it("handles the empty headword", () => {
  expect(deriveWordFields("")).toMatchObject({
    syllablesCount: 0,
    characterLength: 0,
    soundexCode: "",
    wordComponents: [],
  });
});

// Fixture was generated from the original Astro helpers (src/utils/wordHelper.ts,
// src/utils/hypher.ts, getWordComponents in src/pages/api/search/index.json.ts) before the move.
describe("matches the original Astro helpers", () => {
  it.each(expected)("$berlinerisch", ({ berlinerisch, ...want }) => {
    const { wordGroup: _g, soundexCode: _s, ...got } = deriveWordFields(berlinerisch);
    expect(got).toEqual(want);
  });
});

it("soundexCode equals natural.SoundEx().process", () => {
  const ref = new natural.SoundEx();
  for (const { berlinerisch: b } of expected) if (b) expect(soundexCode(b)).toBe(ref.process(b));
});
