import { dotStyle, filledDots } from "@utils/dotMap.ts";
import { describe, expect, it } from "vitest";

describe("dotStyle", () => {
  it("fades from .18 at 30 % to full at 86 % and clamps outside", () => {
    expect(dotStyle(30).opacity).toBeCloseTo(0.18);
    expect(dotStyle(86).opacity).toBeCloseTo(1);
    expect(dotStyle(100).opacity).toBeCloseTo(1);
    expect(dotStyle(0).opacity).toBeCloseTo(0.18);
    expect(dotStyle(58).opacity).toBeCloseTo(0.59);
  });

  it("grows the radius from 1.6 to 3.6", () => {
    expect(dotStyle(0).r).toBeCloseTo(1.6);
    expect(dotStyle(78).r).toBeCloseTo(3.16);
    expect(dotStyle(100).r).toBeCloseTo(3.6);
    expect(dotStyle(50).muted).toBe(false);
  });

  it("mutes a district without a value", () => {
    expect(dotStyle(null)).toEqual({ muted: true, opacity: 0.2, r: 1.6 });
  });
});

describe("filledDots", () => {
  it("fills one dot per 10 %, none without a value", () => {
    expect(filledDots(67)).toBe(7);
    expect(filledDots(64)).toBe(6);
    expect(filledDots(3)).toBe(0);
    expect(filledDots(100)).toBe(10);
    expect(filledDots(null)).toBe(0);
  });
});
