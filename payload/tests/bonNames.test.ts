import { describe, expect, it } from "vitest";

import {
  cleanName,
  displayName,
  isOffensiveName,
  nameCategory,
  NAME_REPORT_LIMIT,
  visibleName,
} from "../src/lib/bonNames";

const BIDI = /[\u202A-\u202E\u2066-\u2069\u200E\u200F\u061C]/;

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
      "Zyklon",
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

describe("isOffensiveName bypasses and false positives", () => {
  it("catches look-alike letters, compatibility forms, hidden or spaced digits and party tokens", () => {
    for (const n of [
      "N\u0430zi", // Cyrillic а
      "H\u0456tler", // Cyrillic і
      "\u0391fD", // Greek Alpha
      "\uFF2E\uFF41\uFF5A\uFF49", // fullwidth Nazi
      "\u{1D40D}\u{1D41A}\u{1D433}\u{1D422}", // math bold Nazi
      "\u2162. Weg", // Roman numeral III
      "Max\uFF18\uFF18", // fullwidth 88
      "8\u200B8", // zero-width space
      "8 8",
      "1 4 8 8",
      "AfD2025",
      "AfD4ever",
      "Afd1",
      "NPDler",
      "\u0274\u1D00\u1D22\u026A", // small-capital Nazi
      "\u{1F1F3}\u{1F1E6}\u{1F1FF}\u{1F1EE}", // regional indicators N A Z I
      "8.8",
      "8-8",
      "8_8",
      "Max 8.8",
      "8\u28008", // braille blank
      "8\u31648", // hangul filler
      "14 88",
      "14 8 8",
      "Max 14 8 8",
      "1 488",
      "148 8",
      "4 44",
      "44 4",
    ])
      expect([n, nameCategory(n)]).toEqual([n, "far-right"]);
    expect(nameCategory("\u13AArsch")).toBe("offensive"); // Cherokee A
  });

  it("lets real names through that contain a listed word", () => {
    for (const n of [
      "Nazih",
      "Al-Anazi",
      "Alanazi",
      "Ignazius",
      "Hubertus Heil",
      "Yamashita",
      "Matsushita",
      "Kinoshita",
      "Ishita",
      "Shitao",
      "Schürer",
      "Schuren",
      "Peniston",
      "Arschak",
      "Afdal",
      "Sh1ne",
      "Klasse 1 98",
      "8.8.1990",
      "14.08.",
      "Tim 18",
      "Jahrgang 1988",
      "Geb. 8.8.90",
      "08.08.",
      "Raum 1.4",
    ])
      expect([n, nameCategory(n)]).toEqual([n, undefined]);
  });

  it("still catches Heil as the whole name", () => {
    expect(nameCategory("Heil")).toBe("far-right");
    expect(nameCategory("Heil!")).toBe("far-right");
  });

  it("does not let an allowed real name or a trailing Heil shield a far-right name", () => {
    for (const n of [
      "Banazi",
      "Sanazi",
      "AnaNazi",
      "NaziHH",
      "Nazihitler",
      "Heil Adolf",
      "Heil Deutschland",
      "Heil Höcke",
      "Heil Wotan",
      "Hıtler", // Turkish dotless ı
      "Nazı",
      "AfDler",
      "AfDlerin",
    ])
      expect([n, nameCategory(n)]).toEqual([n, "far-right"]);
  });

  it("catches Heil before any separator or a blank-rendering filler", () => {
    for (const n of [
      "Heil,Adolf",
      "Heil!Adolf",
      "Heil+Adolf",
      "Heil|Adolf",
      "Heil(Adolf)",
      "Heil;AH",
      "HeilAdolf",
      "HeilㅤAdolf", // hangul filler
      "Heil⠀Adolf", // braille blank
      "Naㅤzi",
      "٨٨", // Arabic-Indic 88
      "८८", // Devanagari 88
    ])
      expect([n, nameCategory(n)]).toEqual([n, "far-right"]);
    for (const n of ["Hubertus Heil", "Heilmann", "Hubertus,Heil"])
      expect([n, nameCategory(n)]).toEqual([n, undefined]);
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

  it("strips bidi controls from a stored name, then applies the filter", () => {
    expect(displayName({ playerName: "\u202EizaN" })).toBe("izaN");
    expect(displayName({ playerName: "H\u202Eitler" })).toBe("Anonym");
    expect(displayName({ playerName: "\u202E" })).toBe("Anonym");
    expect(displayName({ playerName: "Heil Adolf" })).toBe("Anonym");
    for (const n of ["\u202EizaN", "\u2067izaN\u2069", "\u200EKalle\u200F", "\u061CKalle"])
      expect(displayName({ playerName: n })).not.toMatch(BIDI);
  });
});

describe("visibleName", () => {
  it("drops format characters but keeps ZWJ for emoji sequences", () => {
    expect(visibleName("\u202EizaN")).toBe("izaN");
    expect(visibleName("\u2067izaN\u2069")).toBe("izaN");
    expect(visibleName("Ka\u200Blle\u200E")).toBe("Kalle");
    expect(visibleName("👨\u200D👩\u200D👧 Kalle")).toBe("👨\u200D👩\u200D👧 Kalle");
  });
});
