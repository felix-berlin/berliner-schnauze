import type { Geometry } from "@utils/dotMap.ts";

import { dotStyle, filledDots, nearestDistrict, toGeometry } from "@utils/dotMap.ts";
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

describe("nearestDistrict", () => {
  const geometry: Geometry = {
    bezirke: [
      { dots: [[10, 10, 0]], name: "A", slug: "mitte" },
      { dots: [[40, 10, 0]], name: "B", slug: "pankow" },
    ],
    viewBox: { height: 20, width: 50 },
  };

  it("maps a point between dots to the nearest district", () => {
    expect(nearestDistrict(geometry, 14, 12)).toBe("mitte");
    expect(nearestDistrict(geometry, 36, 8)).toBe("pankow");
  });

  it("returns null outside the map", () => {
    expect(nearestDistrict(geometry, 25, 10)).toBeNull();
  });
});

describe("toGeometry", () => {
  const json = {
    bezirke: [{ dots: [[1, 2, 3]], name: "Mitte", slug: "mitte" }],
    viewBox: "0 0 404 340",
  };

  it("parses the viewBox into numbers and keeps the dots", () => {
    expect(toGeometry(json)).toEqual({
      bezirke: [{ dots: [[1, 2, 3]], name: "Mitte", slug: "mitte" }],
      viewBox: { height: 340, width: 404 },
    });
  });

  it("throws on a malformed viewBox, an unknown slug and a short dot", () => {
    expect(() => toGeometry({ ...json, viewBox: "bad" })).toThrow("viewBox");
    expect(() => toGeometry({ ...json, bezirke: [{ ...json.bezirke[0]!, slug: "mite" }] })).toThrow(
      "slug",
    );
    expect(() =>
      toGeometry({ ...json, bezirke: [{ ...json.bezirke[0]!, dots: [[1, 2]] }] }),
    ).toThrow("dot");
  });

  it("accepts the real geometry file", async () => {
    const real = (await import("@assets/berlin-bezirke-punkte.json")).default;
    expect(toGeometry(real).bezirke).toHaveLength(12);
  });
});
