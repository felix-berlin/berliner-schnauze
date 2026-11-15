import { compareRows, plural, progressSegments, usageBars } from "@utils/wordFeedbackView";
import { describe, expect, it } from "vitest";

const options = [
  { label: "Sag ick selbst", value: "say" },
  { label: "Kenn ick", value: "know" },
] as const;

describe("usageBars", () => {
  it("rounds shares and pluralises the vote text", () => {
    expect(usageBars(options, { know: 1, say: 2 }, 3)).toEqual([
      { label: "Sag ick selbst", percent: 67, text: "2 Stimmen", value: "say" },
      { label: "Kenn ick", percent: 33, text: "1 Stimme", value: "know" },
    ]);
  });
  it("shows 0 % without votes or totals", () => {
    expect(usageBars(options, undefined, 0).map((b) => b.percent)).toEqual([0, 0]);
  });
});

describe("progressSegments", () => {
  const all = ["usage", "area", "locality", "age"];
  it("marks done, current, open and skipped steps", () => {
    expect(progressSegments(all, ["usage", "area", "age"], "area")).toEqual([
      { state: "done", step: "usage" },
      { state: "current", step: "area" },
      { state: "skipped", step: "locality" },
      { state: "open", step: "age" },
    ]);
  });
  it("marks every active step done at the end", () => {
    expect(progressSegments(all, all, "done").every((s) => s.state === "done")).toBe(true);
  });
});

describe("compareRows", () => {
  it("drops groups without a share and rows without a name", () => {
    const c = { area: 40, east: 60, locality: 30, moved: null, west: null };
    expect(compareRows(c, "Pankow", null)).toEqual([
      { label: "Ost-Berliner", share: 60 },
      { label: "in Pankow", share: 40 },
    ]);
  });
  it("is empty without comparison data", () => {
    expect(compareRows(undefined, "Pankow", "Prenzlauer Berg")).toEqual([]);
  });
});

describe("edge cases", () => {
  it("plural: 0 and 2 are plural, 1 is singular", () => {
    expect(plural(0)).toBe("0 Stimmen");
    expect(plural(1)).toBe("1 Stimme");
    expect(plural(2)).toBe("2 Stimmen");
  });
  it("compareRows keeps a share of 0 and drops the area row when its share is null", () => {
    const c = { area: null, east: 0, locality: null, moved: null, west: null };
    expect(compareRows(c, "Pankow", null)).toEqual([{ label: "Ost-Berliner", share: 0 }]);
  });
  it("progressSegments: a current step outside active marks nothing as done before it", () => {
    const seg = progressSegments(["a", "b", "c"], ["a", "c"], "b");
    expect(seg.map((x) => x.state)).toEqual(["done", "skipped", "open"]);
  });
  it("usageBars: an option missing from the totals gets 0 %", () => {
    expect(usageBars([{ label: "Sag ich", value: "say" }], { know: 3 }, 3)).toEqual([
      { label: "Sag ich", percent: 0, text: "0 Stimmen", value: "say" },
    ]);
  });
});
