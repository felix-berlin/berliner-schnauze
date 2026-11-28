import { EMPTY_STATE } from "@lib/search/state";
import { MAX_QUERY, parseState, toParams } from "@lib/search/url";
import { describe, expect, it } from "vitest";

const known = { areas: ["mitte", "pankow"], pos: ["Verb", "Adjektiv"], themes: ["essen"] };
const parse = (qs: string) => parseState(new URLSearchParams(qs), known);

describe("search url", () => {
  it("round-trips the SPEC example", () => {
    const qs = "q=brötchen&wortart=verb,adjektiv&gebrauch=oft&inhalt=audio&sort=beliebt";
    const s = parse(qs);
    expect(s.pos).toEqual(["Verb", "Adjektiv"]);
    expect(decodeURIComponent(toParams(s).toString())).toBe(qs);
  });

  it("drops unknown values", () => {
    const s = parse("wortart=foo,verb&silben=9&alter=x&gebrauch=immer&inhalt=audio,quatsch");
    expect(s.pos).toEqual(["Verb"]);
    expect(s.syllables).toBeUndefined();
    expect(s.age).toBeUndefined();
    expect(s.often).toBeUndefined();
    expect(s.content).toEqual(["audio"]);
  });

  it("caps the query at MAX_QUERY", () => {
    expect(parseState(new URLSearchParams({ q: "a".repeat(6000) }), known).q).toHaveLength(
      MAX_QUERY,
    );
  });

  it("trims the query", () => {
    expect(parse("q=%20%20brötchen%20").q).toBe("brötchen");
    expect(parse("q=%20%20").q).toBe("");
  });

  it("empty state has no params", () => {
    expect(toParams(EMPTY_STATE).toString()).toBe("");
    expect(parse("")).toEqual(expect.objectContaining(EMPTY_STATE));
  });

  it("first duplicate wins and list values are deduplicated", () => {
    const s = parse("q=a&q=b&wortart=VERB,verb&gebrauch=oft&gebrauch=kaum");
    expect(s.q).toBe("a");
    expect(s.pos).toEqual(["Verb"]);
    expect(s.often).toBe("oft");
  });

  it("normalizes letter and free text, omits the default sort", () => {
    const s = parse(
      `buchstabe=ä&beginnt=${"x".repeat(40)}&endet=%20&reim=ab&silben=3&berolinismus=1&sort=az`,
    );
    expect(s.letter).toBe("Ä");
    expect(s.starts).toHaveLength(30);
    expect(s.ends).toBeUndefined();
    expect(parse("buchstabe=ab").letter).toBeUndefined();
    expect(decodeURIComponent(toParams(s).toString())).toBe(
      `buchstabe=Ä&beginnt=${"x".repeat(30)}&reim=ab&silben=3&berolinismus=1`,
    );
  });

  it("matches thema and bezirk against known values", () => {
    const s = parse("thema=essen,nope&bezirk=pankow");
    expect(s.themes).toEqual(["essen"]);
    expect(s.area).toBe("pankow");
    expect(parse("bezirk=nope").area).toBeUndefined();
  });
});
