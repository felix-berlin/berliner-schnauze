import { BEZIRK_NAMES } from "@lib/bezirkNames.ts";
import { STORY_BEZIRKE } from "payload-app/story-bezirk";
import { AREA_NAMES, AREAS } from "payload-app/word-feedback";
import { describe, expect, it } from "vitest";

import { BERLIN_AREAS } from "@/data/berlinAreas.ts";

describe("BEZIRK_NAMES", () => {
  it("equals the names of the generated map data (kept apart so the geometry stays out of the form)", () => {
    expect(BEZIRK_NAMES).toEqual(Object.fromEntries(BERLIN_AREAS.map((a) => [a.key, a.name])));
  });
});

describe("AREA_NAMES", () => {
  it("agrees with every Bezirk source: keys and names, umlauts and hyphens included", () => {
    const bezirke = AREAS.filter((a) => a !== "brandenburg" && a !== "elsewhere");
    expect(Object.keys(AREA_NAMES)).toEqual([...bezirke, "brandenburg", "elsewhere"]);
    expect(Object.keys(BEZIRK_NAMES)).toEqual(bezirke);
    expect(BERLIN_AREAS.map((a) => a.key)).toEqual([...bezirke]);
    for (const a of BERLIN_AREAS) expect(a.name).toBe(AREA_NAMES[a.key]);
    expect(STORY_BEZIRKE).toEqual([...bezirke, "outside"]);
    expect(AREA_NAMES["tempelhof-schoeneberg"]).toBe("Tempelhof-Schöneberg");
  });
});
