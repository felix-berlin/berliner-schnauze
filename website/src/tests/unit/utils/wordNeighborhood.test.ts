import { dedupeRelated } from "@utils/wordNeighborhood";
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
