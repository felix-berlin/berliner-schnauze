import { hasCanonicalLink } from "@utils/helpers.ts";
import { describe, expect, it } from "vitest";

describe("hasCanonicalLink", () => {
  it("keeps the canonical on an indexable page", () => {
    expect(hasCanonicalLink({})).toBe(true);
    expect(hasCanonicalLink({ robots: "index, follow" })).toBe(true);
    expect(hasCanonicalLink(undefined)).toBe(true);
  });

  it("drops it on a noindex page without its own canonical", () => {
    expect(hasCanonicalLink({ robots: "noindex, follow" })).toBe(false);
  });

  it("keeps an explicit canonical even on noindex", () => {
    expect(hasCanonicalLink({ canonical: "https://x.test/a", robots: "noindex" })).toBe(true);
  });
});
