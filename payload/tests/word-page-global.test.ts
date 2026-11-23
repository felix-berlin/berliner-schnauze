import { afterAll, describe, expect, it } from "vitest";

import { STORY_PROMPT_DEFAULT, storyPrompt } from "../src/lib/storyPrompt";
import { getTestPayload } from "./helpers/payload";

describe("storyPrompt", () => {
  it("falls back to the default for missing, empty and blank templates", () => {
    expect(storyPrompt(undefined, "Schrippe")).toBe("Wo haste „Schrippe“ zuletzt jehört?");
    expect(storyPrompt(null, "Schrippe")).toBe("Wo haste „Schrippe“ zuletzt jehört?");
    expect(storyPrompt("", "Schrippe")).toBe(storyPrompt(undefined, "Schrippe"));
    expect(storyPrompt("  \n", "Schrippe")).toBe(storyPrompt(undefined, "Schrippe"));
    expect(STORY_PROMPT_DEFAULT).toBe("Wo haste „{Wort}“ zuletzt jehört?");
  });

  it("replaces every {Wort}", () => {
    expect(storyPrompt("{Wort}? Echt, {Wort}!", "Kiez")).toBe("Kiez? Echt, Kiez!");
  });

  it("does not treat $ in the word as a replace pattern", () => {
    expect(storyPrompt("Was is {Wort}?", "a$&b$1")).toBe("Was is a$&b$1?");
  });
});

/** A one-paragraph Lexical state. */
const rich = (text: string): never =>
  ({
    root: {
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [
            { type: "text", detail: 0, format: 0, mode: "normal", style: "", text, version: 1 },
          ],
          direction: "ltr",
          format: "",
          indent: 0,
          version: 1,
        },
      ],
      direction: "ltr",
      format: "",
      indent: 0,
      version: 1,
    },
  }) as never;

describe("word-page global and v18 fields", () => {
  const wordIds: number[] = [];
  const themaIds: number[] = [];
  afterAll(async () => {
    const payload = await getTestPayload();
    for (const id of wordIds) await payload.delete({ collection: "words", id }).catch(() => {});
    for (const id of themaIds) await payload.delete({ collection: "themen", id }).catch(() => {});
    await payload.updateGlobal({ slug: "affiliate", data: { books: [] } });
    await payload.updateGlobal({ slug: "word-page", data: { storyPrompt: null } });
  });

  it("stores storyPrompt", async () => {
    const payload = await getTestPayload();
    await payload.updateGlobal({ slug: "word-page", data: { storyPrompt: "Und {Wort}?" } });
    const doc = await payload.findGlobal({ slug: "word-page" });
    expect(doc.storyPrompt).toBe("Und {Wort}?");
  });

  it("stores the new word fields and book themes", async () => {
    const payload = await getTestPayload();
    const slug = `v18-fields-${Date.now()}`;
    const other = await payload.create({
      collection: "words",
      data: { berlinerisch: "Bolle", slug: `${slug}-b`, _status: "draft" },
      draft: true,
    });
    wordIds.push(other.id);
    const word = await payload.create({
      collection: "words",
      data: {
        berlinerisch: "Stulle",
        slug,
        _status: "draft",
        stress: "ˈʃtʊlə",
        grammar: { plural: "Stullen", diminutive: other.id },
        facts: [
          {
            kind: "herkunft",
            text: rich("Aus dem Niederdeutschen"),
            source: "Meyer",
            contributorName: "Anna",
          },
        ],
        related: [
          { word: other.id, relation: "verwandt", note: "n" },
          { label: "Brot", relation: "gleich" },
        ],
      },
      draft: true,
      depth: 0,
    });
    wordIds.push(word.id);
    expect(word.stress).toBe("ˈʃtʊlə");
    expect(word.grammar).toMatchObject({ plural: "Stullen", diminutive: other.id });
    expect(word.facts?.[0]).toMatchObject({
      kind: "herkunft",
      source: "Meyer",
      contributorName: "Anna",
    });
    expect(word.related?.[1]).toMatchObject({ label: "Brot", relation: "gleich" });

    const thema = await payload.create({
      collection: "themen",
      data: { name: "Essen", slug: `${slug}-t` } as never,
    });
    themaIds.push(thema.id);
    await payload.updateGlobal({
      slug: "affiliate",
      data: { books: [{ title: "Buch", themen: [thema.id] }] },
    });
    const aff = await payload.findGlobal({ slug: "affiliate", depth: 0 });
    expect(aff.books?.[0]?.themen).toEqual([thema.id]);
  });

  it("refuses a story prompt without {Wort}, accepts an empty one", async () => {
    const payload = await getTestPayload();
    await expect(
      payload.updateGlobal({ slug: "word-page", data: { storyPrompt: "Und nu?" } }),
    ).rejects.toThrow(/Frage unter dem/);
    await expect(
      payload.updateGlobal({ slug: "word-page", data: { storyPrompt: "" } }),
    ).resolves.toBeTruthy();
  });

  it("refuses an empty fact row and a related row with neither word nor label", async () => {
    const payload = await getTestPayload();
    const slug = `v18-rows-${Date.now()}`;
    const make = (extra: Record<string, unknown>) =>
      payload.create({
        collection: "words",
        data: { berlinerisch: "Zeilentest", slug, _status: "published", ...extra } as never,
      });
    await expect(make({ facts: [{ kind: "herkunft" }] })).rejects.toThrow();
    await expect(make({ facts: [{ text: rich("ohne Art") }] })).rejects.toThrow();
    // An empty editor (one empty paragraph) is not a text.
    await expect(make({ facts: [{ kind: "herkunft", text: rich("  ") }] })).rejects.toThrow();
    await expect(make({ related: [{ relation: "gleich" }] })).rejects.toThrow();
    const ok = await make({ related: [{ label: "Bolle", relation: "gleich" }] });
    wordIds.push(ok.id);
  });
});
