import { tocItems } from "@lib/wordToc.ts";
import { describe, expect, it } from "vitest";

const model = (over: Record<string, unknown> = {}) =>
  ({
    related: [],
    stories: { items: [], total: 0 },
    word: { examples: [] },
    ...over,
  }) as unknown as Parameters<typeof tocItems>[0];

describe("tocItems", () => {
  it("returns the 7 entries of the spec in order, without counts for an empty word", () => {
    expect(tocItems(model())).toEqual([
      { id: "bedeutung", label: "Bedeutung" },
      { id: "beispiele", label: "Beispiele" },
      { id: "sagste", label: "Sagste det noch?" },
      { id: "jeschichten", label: "Jeschichten" },
      { id: "wissenswertes", label: "Wissenswertes" },
      { id: "verwandt", label: "Verwandte Wörter" },
      { id: "analyse", label: "Analyse" },
    ]);
  });

  it("leaves out the poll and the Jeschichten of a draft", () => {
    expect(tocItems(model(), true).map((i) => i.id)).toEqual([
      "bedeutung",
      "beispiele",
      "wissenswertes",
      "verwandt",
      "analyse",
    ]);
  });

  it("adds a count for examples, stories and related words when greater than 0", () => {
    const items = tocItems(
      model({
        related: [{ label: "a" }, { label: "b" }, { label: "c" }, { label: "d" }],
        stories: { items: [], total: 4 },
        word: { examples: [{ example: "Satz" }, { example: "Satz 2" }, { example: "" }] },
      }),
    );
    expect(items.map((i) => i.count)).toEqual([
      undefined,
      2,
      undefined,
      4,
      undefined,
      4,
      undefined,
    ]);
    expect(items[1]).toHaveProperty("count", 2);
    expect(items[0]).not.toHaveProperty("count");
  });
});
