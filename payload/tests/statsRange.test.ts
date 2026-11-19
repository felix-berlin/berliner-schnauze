import { describe, expect, it } from "vitest";

import { bucketKey, bucketMode, parseRange, pctChange, previousRange } from "../src/lib/statsRange";

const today = "2026-11-19";
const dflt = { from: "2026-10-21", to: "2026-11-19" };

describe("parseRange", () => {
  it("defaults to the last 30 days ending today, without a notice", () => {
    expect(parseRange({}, today)).toEqual({ range: dflt, notice: null });
  });

  it("takes valid von/bis", () => {
    expect(parseRange({ von: "2026-11-01", bis: "2026-11-07" }, today)).toEqual({
      range: { from: "2026-11-01", to: "2026-11-07" },
      notice: null,
    });
  });

  it.each([
    ["von after bis", { von: "2026-11-10", bis: "2026-11-01" }],
    ["garbage", { von: "abc", bis: "2026-11-01" }],
    ["only von", { von: "2026-11-01" }],
    ["impossible date", { von: "2026-02-30", bis: "2026-03-05" }],
    ["array value", { von: ["2026-11-01", "2026-11-02"], bis: "2026-11-05" }],
  ])("falls back to the default with a notice for %s", (_name, params) => {
    const parsed = parseRange(params, today);
    expect(parsed.range).toEqual(dflt);
    expect(parsed.notice).toMatch(/30 Tage/);
  });

  it("cuts a bis in the future back to today", () => {
    expect(parseRange({ von: "2026-11-01", bis: "2026-11-25" }, today)).toEqual({
      range: { from: "2026-11-01", to: today },
      notice: expect.stringContaining("heute"),
    });
  });

  it("falls back when von is also in the future", () => {
    const parsed = parseRange({ von: "2026-11-22", bis: "2026-11-25" }, today);
    expect(parsed.range).toEqual(dflt);
    expect(parsed.notice).not.toBeNull();
  });

  it("keeps bis and cuts von when the range is longer than 366 days", () => {
    expect(parseRange({ von: "2025-10-01", bis: "2026-11-19" }, today)).toEqual({
      range: { from: "2025-11-19", to: "2026-11-19" },
      notice: expect.stringContaining("366"),
    });
  });

  it("allows exactly 366 days without a notice", () => {
    expect(parseRange({ von: "2025-11-19", bis: "2026-11-19" }, today)).toEqual({
      range: { from: "2025-11-19", to: "2026-11-19" },
      notice: null,
    });
  });
});

describe("previousRange", () => {
  it("is as long as the range and ends the day before it starts", () => {
    expect(previousRange({ from: "2026-11-13", to: "2026-11-19" })).toEqual({
      from: "2026-11-06",
      to: "2026-11-12",
    });
  });
});

describe("bucketMode", () => {
  it("switches to weeks above 90 days", () => {
    expect(bucketMode({ from: "2026-08-22", to: "2026-11-19" })).toBe("day"); // 90 days
    expect(bucketMode({ from: "2026-08-21", to: "2026-11-19" })).toBe("week"); // 91 days
  });
});

describe("bucketKey", () => {
  const range = { from: "2026-08-21", to: "2026-11-19" };
  it("is the day itself in day mode", () => {
    expect(bucketKey("2026-11-19", "day", range)).toBe("2026-11-19");
  });
  it("is the Monday of the ISO week in week mode", () => {
    expect(bucketKey("2026-11-19", "week", range)).toBe("2026-11-16"); // Thursday
    expect(bucketKey("2026-11-22", "week", range)).toBe("2026-11-16"); // Sunday
  });
  it("never starts before the range", () => {
    expect(bucketKey("2026-08-21", "week", range)).toBe("2026-08-21"); // Friday, Monday is 08-17
  });
});

describe("pctChange", () => {
  it("gives whole percents", () => {
    expect(pctChange(150, 100)).toBe(50);
    expect(pctChange(50, 200)).toBe(-75);
  });
  it("marks a new value and an empty comparison", () => {
    expect(pctChange(5, 0)).toBe("neu");
    expect(pctChange(0, 0)).toBe("–");
  });
});
