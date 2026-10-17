import { describe, expect, it, vi } from "vitest";

const { fetchAllWords } = vi.hoisted(() => ({ fetchAllWords: vi.fn() }));
vi.mock("@services/payload/words.ts", () => ({ fetchAllWords }));

import { fetchWordRefs, toWordRef } from "@services/payload/wordRefs.ts";

const word = {
  berlinerisch: "aasen",
  examples: [{ example: "big" }],
  id: 1,
  slug: "aasen",
} as never;

describe("toWordRef", () => {
  it("keeps only id, slug and the headword", () => {
    expect(toWordRef(word)).toEqual({
      berlinerisch: "aasen",
      id: 1,
      slug: "aasen",
    });
  });
});

describe("fetchWordRefs", () => {
  it("maps every word to its slim ref", async () => {
    fetchAllWords.mockResolvedValue([word]);
    expect(await fetchWordRefs()).toEqual([
      { berlinerisch: "aasen", id: 1, slug: "aasen" },
    ]);
  });
});

describe("fetchWordRefs memo", () => {
  it("returns the same array within the cache window so derived indexes can key on it", async () => {
    fetchAllWords.mockResolvedValue([word]);
    const { fetchWordRefs: fresh } = await import("@services/payload/wordRefs.ts");
    expect(await fresh()).toBe(await fresh());
  });
});
