import { describe, expect, it, vi } from "vitest";

const { fetchAllWords } = vi.hoisted(() => ({ fetchAllWords: vi.fn() }));
vi.mock("@services/payload/words.ts", () => ({ fetchAllWords }));

import { fetchWordRefs, toWordRef } from "@services/queries/getWords.ts";

const word = { id: "1", slug: "aasen", wordProperties: { berlinerisch: "aasen", examples: [{ example: "big" }] } } as never;

describe("toWordRef", () => {
  it("keeps only id, slug and the headword", () => {
    expect(toWordRef(word)).toEqual({ id: "1", slug: "aasen", wordProperties: { berlinerisch: "aasen" } });
  });
});

describe("fetchWordRefs", () => {
  it("maps every word to its slim ref", async () => {
    fetchAllWords.mockResolvedValue([word]);
    expect(await fetchWordRefs()).toEqual([{ id: "1", slug: "aasen", wordProperties: { berlinerisch: "aasen" } }]);
  });
});
