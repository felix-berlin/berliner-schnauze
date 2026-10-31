import { describe, expect, it } from "vitest";

import {
  containsLink,
  hideThreshold,
  PSEUDONYMS,
  pickPseudonym,
  shouldAutoHide,
} from "../src/lib/comments";

describe("containsLink", () => {
  it.each([
    "https://x.de",
    "http://a.b/c",
    "guck www.spam.com",
    "kauf bei xyz.de",
    "foo.com/bar",
    "SPAM.DE",
    "xyz.de…",
    "xyz.de.",
    "xyz.de»",
    "xyz.de–",
    "ende.Dann",
    "x.example.de",
  ])("%s → true", (t) => expect(containsLink(t)).toBe(true));
  it.each([
    "Na und?",
    "Ick bin 1.5 Meter",
    "z.B. so",
    "Dit is ne Sache… ja.",
    "e-mail",
    "Wir sind ein e.V. wa",
  ])("%s → false", (t) => expect(containsLink(t)).toBe(false));
});
describe("hideThreshold", () => {
  it.each([
    [-5, 2],
    [0, 3],
    [9, 3],
    [25, 5],
    [50, 5],
  ])("score %i → %i", (s, n) => expect(hideThreshold(s)).toBe(n));
});
describe("shouldAutoHide", () => {
  const base = { status: "published" as const, reviewed: false, score: 0, reportCount: 3 };
  it("hides at threshold", () => expect(shouldAutoHide(base)).toBe(true));
  it("not below", () => expect(shouldAutoHide({ ...base, reportCount: 2 })).toBe(false));
  it("never when reviewed", () =>
    expect(shouldAutoHide({ ...base, reviewed: true, reportCount: 99 })).toBe(false));
  it("only published", () => expect(shouldAutoHide({ ...base, status: "pending" })).toBe(false));
});

describe("pickPseudonym", () => {
  it("is stable for a tag and starts at the tag's index", () => {
    expect(pickPseudonym("0000000300000000", new Set())).toBe(PSEUDONYMS[3]);
    expect(pickPseudonym("0000000300000000", new Set())).toBe(PSEUDONYMS[3]);
  });
  it("skips taken names and wraps around", () => {
    const last = PSEUDONYMS.length - 1;
    const tag = last.toString(16).padStart(8, "0") + "00000000";
    expect(pickPseudonym(tag, new Set([PSEUDONYMS[last]]))).toBe(PSEUDONYMS[0]);
  });
  it("numbers the start name when all are taken", () => {
    const taken = new Set<string>(PSEUDONYMS);
    expect(pickPseudonym("0000000000000000", taken)).toBe(`${PSEUDONYMS[0]} 2`);
    taken.add(`${PSEUDONYMS[0]} 2`);
    expect(pickPseudonym("0000000000000000", taken)).toBe(`${PSEUDONYMS[0]} 3`);
  });
  it("has unique names", () => expect(new Set(PSEUDONYMS).size).toBe(PSEUDONYMS.length));
});
