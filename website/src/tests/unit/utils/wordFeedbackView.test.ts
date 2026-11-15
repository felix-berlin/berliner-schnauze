import { compareRows, progressSegments, usageBars } from "@utils/wordFeedbackView";
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
