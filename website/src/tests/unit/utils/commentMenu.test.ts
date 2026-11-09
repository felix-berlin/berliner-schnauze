import { commentMenuEntries, reportText } from "@utils/commentMenu.ts";
import { describe, expect, it } from "vitest";

describe("commentMenuEntries", () => {
  it("others get the link and Melden", () => {
    expect(commentMenuEntries({ editable: false, own: false })).toEqual(["copy", "report"]);
    // an open edit window alone does not make a comment one's own
    expect(commentMenuEntries({ editable: true, own: false })).toEqual(["copy", "report"]);
  });

  it("the author gets Bearbeiten and Löschen while the edit window is open", () => {
    expect(commentMenuEntries({ editable: true, own: true })).toEqual(["copy", "edit", "delete"]);
  });

  it("the author after the window gets only the link, never Melden", () => {
    expect(commentMenuEntries({ editable: false, own: true })).toEqual(["copy"]);
  });
});

describe("reportText", () => {
  it("is the reason alone without a note", () => {
    expect(reportText("Beleidigend", "  ")).toBe("Beleidigend");
  });

  it("joins reason and trimmed note and never exceeds the API limit of 300", () => {
    expect(reportText("Wat anderet", " Kein Bezug ")).toBe("Wat anderet – Kein Bezug");
    expect(reportText("Wat anderet", "x".repeat(300))).toHaveLength(300);
  });
});
