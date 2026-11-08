import { dedupeRelated, hasNeighborhood } from "@utils/wordNeighborhood";
import { describe, expect, it } from "vitest";

const rw = (slug: string) => ({ berlinerisch: slug, id: slug.length, slug });

describe("dedupeRelated", () => {
  it("drops a word that already shows up in the analysis band", () => {
    const related = [rw("schale"), rw("kiez"), rw("molle")];
    expect(dedupeRelated(related, ["schale", "molle"]).map((w) => w.slug)).toEqual(["kiez"]);
  });

  it("keeps everything for an empty exclude list", () => {
    expect(dedupeRelated([rw("kiez")], [])).toHaveLength(1);
  });
});

describe("hasNeighborhood", () => {
  const input = { after: [], before: [], exclude: [] as string[], related: [rw("kiez")], word: "x" };

  it("is false when dedupe and the current-word filter leave nothing", () => {
    expect(hasNeighborhood({ ...input, exclude: ["kiez"] })).toBe(false);
    expect(hasNeighborhood({ ...input, related: [rw("x")] })).toBe(false);
  });

  it("is true with a related word or a neighbour left", () => {
    expect(hasNeighborhood(input)).toBe(true);
    expect(hasNeighborhood({ ...input, after: [rw("y")], exclude: ["kiez"] })).toBe(true);
  });
});
