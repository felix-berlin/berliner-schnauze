import { dotStyle, filledDots, toGeometry } from "@utils/dotMap.ts";
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

describe("toGeometry", () => {
  const json = {
    bezirke: [{ bottom: 2, name: "Mitte", path: "M1 2h0M3.5 2h0", slug: "mitte", top: 2, x: 2.3 }],
    viewBox: "0 0 404 340",
    wave: { reach: 220, x: 206, y: 170 },
  };

  it("parses the viewBox into numbers and keeps paths, positions and the wave", () => {
    expect(toGeometry(json)).toEqual({
      bezirke: [
        { bottom: 2, name: "Mitte", path: "M1 2h0M3.5 2h0", slug: "mitte", top: 2, x: 2.3 },
      ],
      viewBox: { height: 340, width: 404 },
      wave: { reach: 220, x: 206, y: 170 },
    });
  });

  it("throws on a malformed viewBox, an unknown slug and a path that is not dots", () => {
    expect(() => toGeometry({ ...json, viewBox: "bad" })).toThrow("viewBox");
    expect(() => toGeometry({ ...json, bezirke: [{ ...json.bezirke[0]!, slug: "mite" }] })).toThrow(
      "slug",
    );
    expect(() =>
      toGeometry({ ...json, bezirke: [{ ...json.bezirke[0]!, path: "M1 2L3 4" }] }),
    ).toThrow("dot path");
  });

  it("accepts the real geometry file", async () => {
    const real = (await import("@assets/berlin-bezirke-punkte.json")).default;
    const { bezirke } = toGeometry(real);
    expect(bezirke).toHaveLength(12);
    expect(bezirke.map((b) => b.path.split("h0").length - 1).reduce((a, n) => a + n)).toBe(1091);
  });
});
