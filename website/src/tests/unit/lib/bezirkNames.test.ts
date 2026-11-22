import { BEZIRK_NAMES } from "@lib/bezirkNames.ts";
import { describe, expect, it } from "vitest";

import { BERLIN_AREAS } from "@/data/berlinAreas.ts";

describe("BEZIRK_NAMES", () => {
  it("equals the names of the generated map data (kept apart so the geometry stays out of the form)", () => {
    expect(BEZIRK_NAMES).toEqual(Object.fromEntries(BERLIN_AREAS.map((a) => [a.key, a.name])));
  });
});
