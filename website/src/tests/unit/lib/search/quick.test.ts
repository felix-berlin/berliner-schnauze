import {
  activeDescendant,
  keyIntent,
  moveActive,
  quickModel,
  type QuickModel,
} from "@lib/search/quick";
import { buildWordDb } from "@services/wordSearchDb";
import { describe, expect, it } from "vitest";

import { entry } from "../../components/search/fixtures";

// Invented words only (SPEC §17).
const entries = [
  entry("Knusperbrötchen", { wordProperties: tr("Knusperbrötchen", ["Gebäck"]) }),
  ...["Krusteling", "Mehlknubbel", "Teigrolle", "Semmelchen", "Backknust", "Ofenling"].map((w) =>
    entry(w, { wordProperties: tr(w, [`kleines Brötchen (${w})`]) }),
  ),
  entry("Zappler"),
  entry("Zappelbude"),
  entry("Zappelchen"),
  entry("Bezappelt"),
  entry("Rumzappeln"),
  entry("Zappelei"),
  entry("Zappelfritze"),
  entry("Schrumpe", { form: { length: 8, soundex: "S651", syllables: 2 } }),
];
function tr(word: string, translations: string[]) {
  return { ...entry(word).wordProperties, translations };
}
const db = await buildWordDb(entries);
const ctx = {
  trendRanks: new Map([
    ["teigrolle", 2],
    ["zappler", 1],
    ["unbekannt", 3],
    ["ofenling", 4],
    ["backknust", 5],
  ]),
  wotd: "krusteling",
};
const model = (q: string, opts: { ki?: boolean; history?: string[] } = {}) =>
  quickModel(db, entries, q, ctx, { history: [], ki: false, ...opts });
const labels = (m: QuickModel) => m.groups.map((g) => g.label ?? "Aktionen");
const titles = (m: QuickModel) =>
  m.options.map((o) =>
    o.kind === "word" ? o.hit.entry.slug : o.kind === "history" ? o.term : o.title,
  );

describe("quickModel: typing", () => {
  it("brötchen: one word hit, max 4 meaning hits, then the all-hits action", async () => {
    const m = await model("brötchen");
    expect(m.mode).toBe("hits");
    expect(labels(m)).toEqual(["Im Wort", "In der Bedeutung", "Aktionen"]);
    expect(m.groups[0]!.options).toHaveLength(1);
    expect(m.groups[1]!.options).toHaveLength(4);
    expect(m.total).toBe(7);
    const all = m.options.at(-1)!;
    expect(all).toMatchObject({
      action: "all",
      sub: "Mit Filtern und Sortierung",
      title: "Alle 7 Treffer anzeigen",
    });
    expect(m.active).toBe(0);
  });

  it("keeps max 5 word hits, prefix before contains", async () => {
    const m = await model("zappel");
    const words = m.groups[0]!.options.map((o) => (o.kind === "word" ? o.hit.tier : -1));
    expect(words).toHaveLength(5);
    expect(words).toEqual([...words].sort((a, b) => a - b));
    expect(words[0]).toBe(1);
    expect(words.at(-1)).toBe(2);
    expect(m.total).toBe(6);
  });

  it("uses the singular text for one hit", async () => {
    const m = await model("knusper");
    expect(m.options.at(-1)).toMatchObject({ title: "Treffer auf der Suchseite ansehen" });
  });

  it("offers the KI action under 3 words only with KI", async () => {
    expect(titles(await model("brötchen"))).not.toContain("Nach Bedeutung suchen: „brötchen“");
    const m = await model("brötchen", { ki: true });
    expect(m.groups.at(-1)!.options.map((o) => o.kind === "action" && o.action)).toEqual([
      "ki",
      "all",
    ]);
    expect(m.groups.at(-1)!.options[0]).toMatchObject({
      sub: "Findet passende Wörter, ooch ohne Stichwort. Chrome-KI, lokal in deinem Browser.",
      title: "Nach Bedeutung suchen: „brötchen“",
    });
  });

  it("3 words with KI: the description row comes first and is preselected", async () => {
    const q = "kleines brötchen krusteling";
    const m = await model(q, { ki: true });
    expect(m.groups[0]!.label).toBe("Klingt nach ’ner Beschreibung");
    expect(m.options[0]).toMatchObject({ action: "ki", title: `Nach Bedeutung suchen: „${q}“` });
    expect(m.active).toBe(0);
    expect(m.options.filter((o) => o.kind === "action" && o.action === "ki")).toHaveLength(1);
    expect(keyIntent(m, m.active, { key: "Enter" })).toEqual({ type: "ki" });
  });

  it("3 words without KI: no description row", async () => {
    const m = await model("jemand ist kleines brötchen");
    expect(labels(m)).not.toContain("Klingt nach ’ner Beschreibung");
    expect(m.options.some((o) => o.kind === "action" && o.action === "ki")).toBe(false);
  });

  it("gives every option a unique id", async () => {
    const m = await model("brötchen", { ki: true });
    expect(new Set(m.options.map((o) => o.id)).size).toBe(m.options.length);
  });
});

describe("quickModel: nothing found", () => {
  it("shows Meinste pills from the sounds-like hits and the two actions", async () => {
    const m = await model("schrumpö", { ki: true });
    expect(m.mode).toBe("none");
    expect(m.meinste.map((e) => e.slug)).toEqual(["schrumpe"]);
    expect(m.options).toMatchObject([
      {
        action: "ki",
        sub: "Vielleicht passt een Wort, ooch ohne Stichwort. Chrome-KI, lokal in deinem Browser.",
        title: "Nach Bedeutung suchen: „schrumpö“",
      },
      {
        action: "suggest",
        sub: "Wenn’s dit Wort jibt, prüf ick’s und nehm’s uff.",
        title: "Wort vorschlagen: „schrumpö“",
      },
    ]);
  });

  it("drops the KI action without KI", async () => {
    const m = await model("qxqxqx");
    expect(m.mode).toBe("none");
    expect(m.meinste).toEqual([]);
    expect(titles(m)).toEqual(["Wort vorschlagen: „qxqxqx“"]);
  });

  it("punctuation only finds nothing and does not list every word", async () => {
    const m = await model("-");
    expect(m.mode).toBe("none");
  });
});

describe("quickModel: empty field", () => {
  it("history (max 3), Heute, Gerade beliebt (3 from the trend list), nothing preselected", async () => {
    const m = await model("  ", { history: ["a", "b", "c", "d"] });
    expect(m.mode).toBe("idle");
    expect(labels(m)).toEqual(["Zuletzt jesucht", "Heute", "Gerade beliebt"]);
    expect(titles(m)).toEqual(["a", "b", "c", "krusteling", "zappler", "teigrolle", "ofenling"]);
    expect(m.active).toBe(-1);
    expect(activeDescendant(m, m.active)).toBeUndefined();
  });

  it("drops the history group when empty", async () => {
    expect(labels(await model(""))).toEqual(["Heute", "Gerade beliebt"]);
  });
});

describe("keyboard", () => {
  it("first ArrowDown selects the first row, wraps both ways", () => {
    expect(moveActive(-1, 1, 3)).toBe(0);
    expect(moveActive(-1, -1, 3)).toBe(2);
    expect(moveActive(2, 1, 3)).toBe(0);
    expect(moveActive(0, -1, 3)).toBe(2);
    expect(moveActive(-1, 1, 0)).toBe(-1);
  });

  it("aria-activedescendant points at the active option", async () => {
    const m = await model("brötchen");
    expect(activeDescendant(m, 1)).toBe(m.options[1]!.id);
  });

  it("Enter opens the word, Ctrl/⌘+Enter the search page, Shift+Enter starts KI only with KI", async () => {
    const m = await model("brötchen");
    expect(keyIntent(m, 0, { key: "Enter" })).toEqual({
      href: "/wort/knusperbrötchen",
      slug: "knusperbrötchen",
      type: "open-word",
    });
    const page = { href: "/wort?q=br%C3%B6tchen", type: "search-page" };
    expect(keyIntent(m, 0, { ctrlKey: true, key: "Enter" })).toEqual(page);
    expect(keyIntent(m, 0, { key: "Enter", metaKey: true })).toEqual(page);
    expect(keyIntent(m, m.options.length - 1, { key: "Enter" })).toEqual(page);
    expect(keyIntent(m, 0, { key: "Enter", shiftKey: true })).toBeNull();
    const ki = await model("brötchen", { ki: true });
    expect(keyIntent(ki, 0, { key: "Enter", shiftKey: true })).toEqual({ type: "ki" });
  });

  it("Enter on the suggest action goes to the suggest form", async () => {
    const m = await model("qxqxqx");
    expect(keyIntent(m, 0, { key: "Enter" })).toEqual({
      href: "/wort-vorschlagen?wort=qxqxqx",
      type: "suggest",
    });
  });

  it("empty state: Enter without an active row does nothing, Del removes a history row", async () => {
    const m = await model("", { history: ["quark"] });
    expect(keyIntent(m, -1, { key: "Enter" })).toBeNull();
    expect(keyIntent(m, -1, { ctrlKey: true, key: "Enter" })).toBeNull();
    expect(keyIntent(m, 0, { key: "Enter" })).toEqual({ term: "quark", type: "fill" });
    expect(keyIntent(m, 0, { key: "Delete" })).toEqual({ term: "quark", type: "remove-history" });
    expect(keyIntent(m, 1, { key: "Delete" })).toBeNull();
  });
});
