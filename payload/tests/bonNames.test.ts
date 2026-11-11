import { describe, expect, it } from "vitest";

import {
  cleanName,
  displayName,
  isOffensiveName,
  nameCategory,
  NAME_REPORT_LIMIT,
} from "../src/lib/bonNames";

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
      "Arschloch",
      "Arschgeige",
      "Fickdich",
      "Nazischwein",
      "Spasti",
      "xXNaziXx",
      "Nazi123",
      "AfD",
      "A f D",
      "NPD",
      "Die Heimat",
      "Der III. Weg",
      "Dritter Weg",
      "Combat 18",
      "C18",
      "Sieg Heil",
      "1488",
      "14 88",
      "HH",
      "Himmler",
      "Rudolf Heß",
      "Führer",
      "Endsieg",
      "Reichsbürger",
      "Blood & Honour",
      "Hammerskins",
      "Junge Alternative",
      "WPWW",
      "Schwarze Sonne",
      "AH18",
      "444",
      "168:1",
      "198",
      "Die Rechte",
      "NSDAP",
      "Volkstod",
      "Arier",
      "Zyklon B",
      "Identitäre Bewegung",
      "Kühnengruß",
      "Vollidiot",
      "Du Hurensohn",
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
      "Marsch",
      "Barsch",
      "Heimat",
      "Tim 18",
      "Sascha",
      "Hassan",
      "Christa",
      "Dirk",
      "Afra",
      "Ignazio",
      "Reiseführer",
      "Helga",
      "Mirko",
      "Thorsten",
      "Wilhelm",
      "Ilse",
    ])
      expect([n, isOffensiveName(n)]).toEqual([n, false]);
  });
});

describe("nameCategory", () => {
  it("tells far-right from other insults, far-right first", () => {
    expect(nameCategory("Heil Hitler")).toBe("far-right");
    expect(nameCategory("Arschloch")).toBe("offensive");
    expect(nameCategory("Nazi Arsch")).toBe("far-right");
    expect(nameCategory("Klaus")).toBeUndefined();
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
