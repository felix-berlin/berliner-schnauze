import { buildWordSections, hasOrigin } from "@utils/wordSections";
import { describe, expect, it } from "vitest";

const full = { draft: false, hasExamples: true, hasNeighborhood: true, hasOrigin: true };
const ids = (facts: Parameters<typeof buildWordSections>[0]) =>
  buildWordSections(facts).map((s) => s.id);

describe("buildWordSections", () => {
  it("lists all seven sections in page order for a full word", () => {
    expect(buildWordSections(full)).toEqual([
      { id: "bedeutung", label: "Bedeutung" },
      { id: "sagste-det-noch", label: "Umfrage" },
      { id: "etymologie", label: "Etymologie" },
      { id: "beispiele", label: "Beispiele" },
      { id: "analyse", label: "Analyse" },
      { id: "verwandte-worte", label: "Umfeld" },
      { id: "kommentare", label: "Kommentare" },
    ]);
  });

  it("drops Etymologie without origin or sources", () => {
    expect(ids({ ...full, hasOrigin: false })).not.toContain("etymologie");
  });

  it("drops Beispiele without examples", () => {
    expect(ids({ ...full, hasExamples: false })).not.toContain("beispiele");
  });

  it("drops Umfeld when the card has nothing to show", () => {
    expect(ids({ ...full, hasNeighborhood: false })).not.toContain("verwandte-worte");
  });

  it("drops Umfrage and Kommentare for a draft but keeps Umfeld", () => {
    const result = ids({ ...full, draft: true });
    expect(result).not.toContain("sagste-det-noch");
    expect(result).not.toContain("kommentare");
    expect(result).toContain("verwandte-worte");
  });
});

describe("hasOrigin", () => {
  it("is true for an origin text or a non-empty source", () => {
    expect(hasOrigin({ infoTextHtml: "<p>x</p>" })).toBe(true);
    expect(hasOrigin({ sources: ["", "Meyer"] })).toBe(true);
  });

  it("is false without origin text and sources", () => {
    expect(hasOrigin({ infoTextHtml: null, sources: ["", null] })).toBe(false);
    expect(hasOrigin({})).toBe(false);
  });
});
