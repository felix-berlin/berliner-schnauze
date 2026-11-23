import { describe, expect, it } from "vitest";

import { STORY_BEZIRKE } from "../src/lib/storyBezirk";

describe("STORY_BEZIRKE", () => {
  it("holds the 12 districts plus outside", () => {
    expect(STORY_BEZIRKE).toHaveLength(13);
    expect(STORY_BEZIRKE).toContain("mitte");
    expect(STORY_BEZIRKE).toContain("outside");
    expect(STORY_BEZIRKE).not.toContain("brandenburg");
    expect(STORY_BEZIRKE).not.toContain("elsewhere");
  });
});
