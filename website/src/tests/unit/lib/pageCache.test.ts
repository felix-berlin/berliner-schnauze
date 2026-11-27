import { WORD_PAGE_CACHE_CONTROL } from "@lib/pageCache.ts";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("word page Cache-Control", () => {
  it("lets a browser reuse the page for 30 s and never serve it stale", () => {
    expect(WORD_PAGE_CACHE_CONTROL).toMatch(/^public, max-age=30$/);
  });

  it("is what the page sends, with no other Cache-Control literal beside it", () => {
    const page = readFileSync(
      new URL("../../../pages/wort/[...wordSlug].astro", import.meta.url),
      "utf8",
    );
    expect(page).toContain("headers.set('Cache-Control', WORD_PAGE_CACHE_CONTROL)");
    expect(page).not.toMatch(/stale-while-revalidate|s-maxage/);
  });
});
