import { describe, expect, it } from "vitest";

import { daysBetween, isDay, mondayOf } from "../src/lib/berlinTime";

describe("isDay", () => {
  it("accepts real days and rejects everything else", () => {
    expect(isDay("2026-11-19")).toBe(true);
    for (const v of ["2026-02-30", "2026-13-01", "26-11-19", "", 20261119, null, ["2026-11-19"]])
      expect(isDay(v)).toBe(false);
  });
});

describe("daysBetween", () => {
  it("counts calendar days, over month ends and leap days", () => {
    expect(daysBetween("2026-11-19", "2026-11-19")).toBe(0);
    expect(daysBetween("2026-11-19", "2026-12-01")).toBe(12);
    expect(daysBetween("2024-02-28", "2024-03-01")).toBe(2);
    expect(daysBetween("2026-11-19", "2026-11-18")).toBe(-1);
  });
});

describe("mondayOf", () => {
  it("is the Monday of the ISO week", () => {
    expect(mondayOf("2026-11-16")).toBe("2026-11-16"); // Monday
    expect(mondayOf("2026-11-22")).toBe("2026-11-16"); // Sunday
    expect(mondayOf("2026-01-01")).toBe("2025-12-29"); // across the year
  });
});
