import { describe, expect, it } from "vitest";

import { lexicalToHtml } from "../src/lib/lexicalHtml";
import { suggestionEntry, textToLexical } from "../src/lib/suggestionEntry";

const base = { id: 7, userName: "Betty" };

describe("textToLexical", () => {
  it("makes one paragraph per blank-line block and keeps single line breaks inside", () => {
    const { root } = textToLexical("Eins\nzwei\n\nDrei\n\n\n  \nVier") as unknown as {
      root: { children: { type: string; children: { text?: string; type: string }[] }[] };
    };
    expect(root.children.map((p) => p.type)).toEqual(["paragraph", "paragraph", "paragraph"]);
    const texts = root.children.map((p) => p.children.map((c) => c.text ?? "\n").join(""));
    expect(texts).toEqual(["Eins\nzwei", "Drei", "Vier"]); // a linebreak node reads back as "\n"
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

describe("suggestionEntry edge cases", () => {
  it("cuts the credit name to the 40 characters a word row allows", () => {
    const { row } = suggestionEntry({
      id: 1,
      type: "example",
      text: "Satz.",
      userName: "N".repeat(100),
    });
    expect((row as { contributorName: string }).contributorName).toHaveLength(40);
  });

  it("refuses a fact without a kind and a kind or relation the word does not know", () => {
    expect(() => suggestionEntry({ id: 1, type: "fact", text: "A" })).toThrow(/Art/);
    expect(() => suggestionEntry({ id: 1, type: "fact", kind: "quatsch", text: "A" })).toThrow(
      /Art/,
    );
    expect(() =>
      suggestionEntry({ id: 1, type: "related", relatedText: "A", relation: "quatsch" }),
    ).toThrow(/Beziehung/);
  });

  it("leaves the relation out when the suggestion has none", () => {
    const { row } = suggestionEntry({ id: 1, type: "related", relatedText: "Pfote" });
    expect(row).toEqual({ label: "Pfote", contributorSuggestion: 1 });
  });
});

describe("textToLexical line breaks", () => {
  it("turns a single line break into a linebreak node instead of a raw newline", () => {
    const { root } = textToLexical("Eins\nzwei") as unknown as {
      root: { children: { children: { text?: string; type: string }[] }[] };
    };
    expect(root.children[0]!.children.map((c) => c.type)).toEqual(["text", "linebreak", "text"]);
    expect(root.children[0]!.children.map((c) => c.text)).toEqual(["Eins", undefined, "zwei"]);
  });
});

describe("textToLexical rendering", () => {
  it("renders paragraphs and line breaks as html the site shows", () => {
    expect(lexicalToHtml(textToLexical("Eins\nzwei\n\nDrei"))).toMatch(
      /<p>Eins<br\s*\/?>zwei<\/p>\s*<p>Drei<\/p>/,
    );
  });
});
