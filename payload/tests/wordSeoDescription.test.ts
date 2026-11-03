import { describe, expect, it } from "vitest";

import { wordSeoDescription, wordSeoTitle } from "../src/lib/routes";

describe("wordSeoDescription", () => {
  const base = { berlinerisch: "anmachen", translations: ["jemanden anflirten", "sich jemandem nähern"] };

  it("still describes a word without meanings", () => {
    const text = wordSeoDescription({ ...base, hasExamples: true, translations: [] });
    expect(text).toBe(`${base.berlinerisch} im Berlinerisch-Wörterbuch der Berliner Schnauze. Mit Beispielsätzen.`);
  });

  it("names only the parts the entry has", () => {
    expect(wordSeoDescription(base)).toBe(
      "anmachen heißt auf Berlinerisch: jemanden anflirten, sich jemandem nähern.",
    );
    expect(wordSeoDescription({ ...base, hasAudio: true })).toContain("Mit Aussprache.");
    expect(wordSeoDescription({ ...base, hasEtymology: true, hasAudio: true, hasExamples: true })).toContain(
      "Mit Etymologie, Aussprache & Beispielsätzen.",
    );
  });

  it("stays within 160 characters, dropping the last meanings before the parts, never mid-meaning", () => {
    const long = { berlinerisch: "x", hasAudio: true, translations: ["a".repeat(50), "b".repeat(50), "c".repeat(50)] };
    const text = wordSeoDescription(long);
    expect(text.length).toBeLessThanOrEqual(160);
    expect(text).toContain("b".repeat(50));
    expect(text).not.toContain("c".repeat(50));
    expect(text).toContain("Mit Aussprache.");
  });

  it("cuts a single over-long meaning with an ellipsis", () => {
    const text = wordSeoDescription({ berlinerisch: "x", translations: ["a".repeat(300)] });
    expect(text).toHaveLength(160);
    expect(text.endsWith("…")).toBe(true);
  });
});

describe("wordSeoTitle", () => {
  const base = { berlinerisch: "anmachen", translations: ["jemanden anflirten"] };

  it("names only the parts the entry has", () => {
    expect(wordSeoTitle(base)).toBe("anmachen auf Berlinerisch — Bedeutung | Berliner Schnauze");
    expect(wordSeoTitle({ ...base, hasExamples: true, hasEtymology: true })).toBe(
      "anmachen auf Berlinerisch — Bedeutung & Beispiele | Berliner Schnauze",
    );
  });

  it("has no dash without any part", () => {
    expect(wordSeoTitle({ berlinerisch: "x", translations: [] })).toBe("x auf Berlinerisch | Berliner Schnauze");
  });

  it("stays within 70 characters by dropping the last parts", () => {
    const title = wordSeoTitle({ ...base, berlinerisch: "Kiezspaziergang", hasExamples: true, hasEtymology: true, hasAudio: true });
    expect(title.length).toBeLessThanOrEqual(70);
    expect(title).toContain("Bedeutung");
  });
});
