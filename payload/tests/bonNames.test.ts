import { describe, expect, it } from "vitest";

import { cleanName, displayName, isOffensiveName, NAME_REPORT_LIMIT } from "../src/lib/bonNames";

describe("isOffensiveName", () => {
  it("catches leetspeak, spacing, case and umlauts", () => {
    for (const n of [
      "H1tler",
      "A r s c h",
      "FICK",
      "Sch3iß3",
      "Heil Hitler",
      "Kalle88",
      "n@zi",
      "Tim 88",
      "Du Arsch",
    ])
      expect([n, isOffensiveName(n)]).toEqual([n, true]);
  });

  it("lets common names through", () => {
    for (const n of [
      "Klaus",
      "Schnitzel",
      "Anonym",
      "Hannelore",
      "Ingo",
      "Jürgen",
      "Berta",
      "Marschall",
      "Nazim",
      "Thure",
      "Heilmann",
      "Fickert",
      "Jahrgang 1988",
      "Mike1988",
    ])
      expect([n, isOffensiveName(n)]).toEqual([n, false]);
  });
});

describe("cleanName", () => {
  it("replaces an offensive name by Anonym and keeps the rest", () => {
    expect(cleanName("H1tler")).toBe("Anonym");
    expect(cleanName("Kalle")).toBe("Kalle");
  });
});

describe("displayName", () => {
  const game = (extra: Record<string, unknown>) =>
    displayName({ nameHidden: false, nameReports: 0, playerName: "Kalle", ...extra });

  it("hides a hidden name and one at the report limit", () => {
    expect(game({})).toBe("Kalle");
    expect(game({ nameReports: NAME_REPORT_LIMIT - 1 })).toBe("Kalle");
    expect(game({ nameReports: NAME_REPORT_LIMIT })).toBe("Anonym");
    expect(game({ nameHidden: true })).toBe("Anonym");
  });

  it("treats missing values as a plain name, and a missing name as Anonym", () => {
    expect(displayName({ playerName: "Kalle" })).toBe("Kalle");
    expect(displayName({ playerName: null })).toBe("Anonym");
  });
});
