import { describe, expect, it } from "vitest";

import { matchKey, wordSlug } from "../src/lib/wordMatch";

describe("wordSlug", () => {
  it.each([
    ["Verfüjen, sich", "verfuejen-sich"],
    ["j.w.d.", "j-w-d"],
    ["Opodéldok", "opodeldok"],
    ["abknöpp’n", "abknoeppn"],
    ["Großkotz", "grosskotz"],
  ])("%s → %s", (input, slug) => expect(wordSlug(input)).toBe(slug));
});

describe("matchKey", () => {
  it.each([
    ["Kabolz schießen", "Kabolzschießen"],
    ["Gold-Else", "Goldelse"],
    ["Jrapschen", "grapschen"],
    ["Mausebraten", "Mausebraten"],
  ])("%s matches %s", (a, b) => expect(matchKey(a)).toBe(matchKey(b)));

  it("keeps different words apart", () => expect(matchKey("Gummi")).not.toBe(matchKey("Gummiadler")));
});
