import { highlightParts } from "@lib/search/highlight";
import { describe, expect, it } from "vitest";

const marked = (text: string, q: string) =>
  highlightParts(text, q)
    .filter((p) => p.mark)
    .map((p) => p.text);

describe("highlightParts", () => {
  it("highlight under 3 chars", () => {
    expect(highlightParts("Schrippe", "ab")).toEqual([{ mark: false, text: "Schrippe" }]);
    expect(marked("Schrippe, Brötchen", "Schrip bröt")).toEqual(["Schrip", "Bröt"]);
    expect(marked("Brötchen", "brötchen")).toEqual(["Brötchen"]);
  });

  it("handles blank and regex characters", () => {
    expect(highlightParts("a.b", "  ")).toEqual([{ mark: false, text: "a.b" }]);
    expect(marked("a.b", "(.*)")).toEqual([]);
  });
});
