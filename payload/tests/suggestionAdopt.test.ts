import { afterEach, describe, expect, it, vi } from "vitest";

import { getTestPayload } from "./helpers/payload";

const SLUG = "adopt-testwort";
const SPELLING = "Adopt Testwort";

afterEach(async () => {
  vi.restoreAllMocks();
  const payload = await getTestPayload();
  await payload.delete({
    collection: "suggestions",
    where: { or: [{ text: { like: "adopt-test" } }, { relatedText: { like: "adopt-test" } }] },
  });
  await payload.delete({ collection: "words", where: { slug: { equals: SLUG } }, trash: true });
});

const CHANGED = "2020-01-01T00:00:00.000Z";
const stamp = async () =>
  ((await (await getTestPayload()).findGlobal({ slug: "cache-stamp" })).changedAt ?? null) as
    | string
    | null;

const liveWord = async () =>
  (await getTestPayload()).create({
    collection: "words",
    data: {
      berlinerisch: SPELLING,
      slug: SLUG,
      translations: [{ translation: "x" }],
      _status: "published",
    },
  });
const suggest = async (targetWord: number, extra: Record<string, unknown> = {}) =>
  (await getTestPayload()).create({
    collection: "suggestions",
    data: {
      type: "example",
      targetWord,
      text: "adopt-test Satz",
      userName: "Betty",
      ...extra,
    } as never,
  });
const accept = async (id: number) =>
  (await getTestPayload()).update({
    collection: "suggestions",
    id,
    data: { status: "accepted" },
    depth: 0,
  });
const published = async (id: number) =>
  (await getTestPayload()).findByID({ collection: "words", id, depth: 0, draft: false });

describe("accepting an example, fact or related suggestion", () => {
  it("writes an example with its credit into the live word and keeps it published", async () => {
    const word = await liveWord();
    const s = await suggest(word.id, { highdeutsch: "adopt-test Hochdeutsch" });
    await accept(s.id);
    const after = await published(word.id);
    expect(after._status).toBe("published");
    expect(after.examples).toHaveLength(1);
    expect(after.examples?.[0]).toMatchObject({
      example: "adopt-test Satz",
      exampleExplanation: "adopt-test Hochdeutsch",
      contributorName: "Betty",
      contributorSuggestion: s.id,
    });
  });

  it("writes a fact with kind, rich text and credit", async () => {
    const word = await liveWord();
    const s = await suggest(word.id, {
      type: "fact",
      kind: "herkunft",
      text: "adopt-test Herkunft",
    });
    await accept(s.id);
    const fact = (await published(word.id)).facts?.[0];
    expect(fact).toMatchObject({
      kind: "herkunft",
      contributorName: "Betty",
      contributorSuggestion: s.id,
    });
    expect(JSON.stringify(fact?.text)).toContain("adopt-test Herkunft");
  });

  it("writes a related entry with label, relation and credit", async () => {
    const word = await liveWord();
    const s = await suggest(word.id, {
      type: "related",
      relation: "gleich",
      relatedText: "adopt-test Pfote",
      text: undefined,
    });
    await accept(s.id);
    expect((await published(word.id)).related?.[0]).toMatchObject({
      label: "adopt-test Pfote",
      relation: "gleich",
      contributorName: "Betty",
      contributorSuggestion: s.id,
    });
  });

  it("appends to existing rows instead of replacing them", async () => {
    const word = await liveWord();
    await accept((await suggest(word.id, { text: "adopt-test eins" })).id);
    await accept((await suggest(word.id, { text: "adopt-test zwei" })).id);
    expect((await published(word.id)).examples?.map((e) => e.example)).toEqual([
      "adopt-test eins",
      "adopt-test zwei",
    ]);
  });

  it("does not add the entry a second time when an accepted suggestion is saved again", async () => {
    const word = await liveWord();
    const s = await suggest(word.id);
    await accept(s.id);
    await (
      await getTestPayload()
    ).update({
      collection: "suggestions",
      id: s.id,
      data: { status: "accepted", userName: "Bertha" },
    });
    expect((await published(word.id)).examples).toHaveLength(1);
  });

  it("changes the cache stamp, so the public page shows the entry", async () => {
    const word = await liveWord();
    const s = await suggest(word.id);
    await (
      await getTestPayload()
    ).updateGlobal({ slug: "cache-stamp", data: { changedAt: CHANGED } });
    await accept(s.id);
    expect(await stamp()).not.toBe(CHANGED);
  });

  it("aborts and changes nothing when the word has newer unpublished draft changes", async () => {
    const payload = await getTestPayload();
    const word = await liveWord();
    await payload.update({
      collection: "words",
      id: word.id,
      data: { berlinerisch: "Adopt Entwurf" },
      draft: true,
    });
    const s = await suggest(word.id);
    await expect(accept(s.id)).rejects.toThrow(/unveröffentlichte Entwurfsänderungen/);
    expect((await payload.findByID({ collection: "suggestions", id: s.id, depth: 0 })).status).toBe(
      "new",
    );
    expect((await published(word.id)).examples ?? []).toHaveLength(0);
  });

  it("aborts when the word was never published", async () => {
    const payload = await getTestPayload();
    const word = await payload.create({
      collection: "words",
      draft: true,
      data: { berlinerisch: SPELLING, slug: SLUG },
    });
    const s = await suggest(word.id);
    await expect(accept(s.id)).rejects.toThrow(/nicht veröffentlicht/);
    expect((await payload.findByID({ collection: "suggestions", id: s.id, depth: 0 })).status).toBe(
      "new",
    );
  });

  it("aborts when the word is in the trash", async () => {
    const payload = await getTestPayload();
    const word = await liveWord();
    const s = await suggest(word.id);
    await payload.update({
      collection: "words",
      id: word.id,
      data: { deletedAt: new Date().toISOString() },
      trash: true,
    });
    await expect(accept(s.id)).rejects.toThrow(/Papierkorb/);
    expect((await payload.findByID({ collection: "suggestions", id: s.id, depth: 0 })).status).toBe(
      "new",
    );
  });

  it("publishes the word of a new-word suggestion and locks the suggestion", async () => {
    const payload = await getTestPayload();
    const s = await payload.create({
      collection: "suggestions",
      data: {
        type: "word",
        berlinerWord: SPELLING,
        translation: "adopt-test x",
        example: "adopt-test Satz",
      },
    });
    const done = await accept(s.id);
    const word = await published(done.word as number);
    expect(word).toMatchObject({ _status: "published", slug: SLUG, berlinerisch: SPELLING });
    expect(word.examples?.[0]?.example).toBe("adopt-test Satz");
    expect((await payload.findByID({ collection: "suggestions", id: s.id })).lockedByWord).toBe(
      true,
    );
  });

  it("only links a word chosen by hand and leaves it a draft", async () => {
    const payload = await getTestPayload();
    const chosen = await payload.create({
      collection: "words",
      draft: true,
      data: { berlinerisch: SPELLING, slug: SLUG },
    });
    const s = await payload.create({
      collection: "suggestions",
      data: { type: "word", berlinerWord: SPELLING, translation: "adopt-test x", word: chosen.id },
    });
    await accept(s.id);
    const after = await payload.findByID({
      collection: "words",
      id: chosen.id,
      depth: 0,
      draft: true,
    });
    expect(after._status).toBe("draft");
    expect(after.translations ?? []).toHaveLength(0);
  });
});
