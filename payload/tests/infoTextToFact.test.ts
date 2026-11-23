import { describe, expect, it } from "vitest";

import { decideInfoTextFact, parseFactKind, SOURCE_MAX } from "../src/lib/infoTextToFact";

const rich = (t: string) => ({
  root: { children: [{ type: "paragraph", children: [{ text: t }] }] },
});

describe("decideInfoTextFact", () => {
  it("skips an empty infoText", () => {
    expect(decideInfoTextFact({ infoText: rich("  ") }, "herkunft", false).action).toBe("empty");
    expect(decideInfoTextFact({}, "herkunft", false).action).toBe("empty");
  });

  it("is idempotent: a fact with the identical text is already there", () => {
    const infoText = rich("Aus dem Niederdeutschen");
    const word = { infoText, facts: [{ text: rich("Aus dem Niederdeutschen") }] };
    expect(decideInfoTextFact(word, "herkunft", false).action).toBe("alreadyThere");
  });

  it("skips a word with a newer draft, also when it has no fact yet", () => {
    expect(decideInfoTextFact({ infoText: rich("x") }, "herkunft", true).action).toBe("hasDraft");
  });

  it("joins the sources with '; ' and cuts the source at SOURCE_MAX", () => {
    const word = { infoText: rich("x"), sources: ["Meyer", "Schmidt"] };
    const d = decideInfoTextFact(word, "geschichte", false);
    expect(d).toMatchObject({ action: "copy", source: "Meyer; Schmidt", tooLongSource: false });
    const long = decideInfoTextFact(
      { infoText: rich("x"), sources: ["a".repeat(250)] },
      "herkunft",
      false,
    );
    if (long.action !== "copy") throw new Error("expected copy");
    expect(long.tooLongSource).toBe(true);
    expect((long.facts[0]!.source as string).length).toBe(SOURCE_MAX);
  });

  it("keeps existing facts, appends the new one and omits an empty source", () => {
    const existing = { kind: "gebrauch", text: rich("alt") };
    const d = decideInfoTextFact({ infoText: rich("neu"), facts: [existing] }, "herkunft", false);
    if (d.action !== "copy") throw new Error("expected copy");
    expect(d.facts).toEqual([existing, { kind: "herkunft", text: rich("neu") }]);
    expect(d.source).toBe("");
  });
});

describe("parseFactKind", () => {
  it("accepts a kind and rejects anything else", () => {
    expect(parseFactKind("anekdote")).toBe("anekdote");
    expect(() => parseFactKind("quatsch")).toThrow(/--kind must be one of/);
  });
});
