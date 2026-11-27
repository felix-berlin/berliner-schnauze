import { WORD_PAGE_CACHE_CONTROL } from "@lib/pageCache.ts";
import { describe, expect, it } from "vitest";

describe("WORD_PAGE_CACHE_CONTROL", () => {
  it("lets a browser reuse the page for 30 s and never serve it stale", () => {
    expect(WORD_PAGE_CACHE_CONTROL).toBe("public, max-age=30");
    expect(WORD_PAGE_CACHE_CONTROL).not.toMatch(/stale-while-revalidate|s-maxage/);
  });
});
