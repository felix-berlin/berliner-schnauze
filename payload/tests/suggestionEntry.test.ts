import { describe, expect, it } from "vitest";

import { suggestionEntry, textToLexical } from "../src/lib/suggestionEntry";

const base = { id: 7, userName: "Betty" };

describe("textToLexical", () => {
  it("makes one paragraph per blank-line block and keeps single line breaks inside", () => {
    const { root } = textToLexical("Eins\nzwei\n\nDrei\n\n\n  \nVier") as {
      root: { children: { type: string; children: { text?: string; type: string }[] }[] };
    };
    expect(root.children.map((p) => p.type)).toEqual(["paragraph", "paragraph", "paragraph"]);
    const texts = root.children.map((p) => p.children.map((c) => c.text ?? "\n").join(""));
    expect(texts).toEqual(["Eins\nzwei", "Drei", "Vier"]);
  });
});

describe("suggestionEntry", () => {
  it("builds an example row with the explanation and the credit", () => {
    expect(
      suggestionEntry({
        ...base,
        type: "example",
        text: " Nimm deene Griffel weg! ",
        highdeutsch: "Nimm die Finger weg!",
      }),
    ).toEqual({
      field: "examples",
      row: {
        example: "Nimm deene Griffel weg!",
        exampleExplanation: "Nimm die Finger weg!",
        contributorName: "Betty",
        contributorSuggestion: 7,
      },
    });
  });

  it("omits the name and the explanation when the suggester gave none", () => {
    const { row } = suggestionEntry({ id: 7, type: "example", text: "Satz." });
    expect(row).toEqual({ example: "Satz.", contributorSuggestion: 7 });
  });

  it("builds a fact row with its kind and the text as rich text", () => {
    const entry = suggestionEntry({ ...base, type: "fact", kind: "herkunft", text: "A\n\nB" });
    expect(entry.field).toBe("facts");
    expect(entry.row).toMatchObject({
      kind: "herkunft",
      contributorName: "Betty",
      contributorSuggestion: 7,
    });
    expect(
      (entry.row as { text: { root: { children: unknown[] } } }).text.root.children,
    ).toHaveLength(2);
  });

  it("builds a related row from the related text and the relation", () => {
    expect(
      suggestionEntry({ ...base, type: "related", relation: "gleich", relatedText: "Pfote" }),
    ).toEqual({
      field: "related",
      row: {
        label: "Pfote",
        relation: "gleich",
        contributorName: "Betty",
        contributorSuggestion: 7,
      },
    });
  });

  it.each([
    [{ type: "example", text: "  " }, /Beispielsatz/],
    [{ type: "fact", kind: "herkunft", text: "" }, /Text/],
    [{ type: "related", relation: "gleich", relatedText: " " }, /verwandte/i],
    [{ type: "word" }, /Typ/],
  ])("refuses %j with a readable message", (s, message) => {
    expect(() => suggestionEntry({ id: 1, ...s })).toThrow(message);
  });
});
