import { describe, expect, it } from "vitest";

import { containsLink, hideThreshold, shouldAutoHide } from "../src/lib/comments";

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
  ])("%s → true", (t) => expect(containsLink(t)).toBe(true));
  it.each(["Na und?", "Ick bin 1.5 Meter", "z.B. so", "Dit is ne Sache… ja.", "e-mail"])(
    "%s → false",
    (t) => expect(containsLink(t)).toBe(false),
  );
});
describe("hideThreshold", () => {
  it.each([
    [-5, 2],
    [0, 3],
    [9, 3],
    [25, 5],
    [50, 8],
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
