import { afterEach, describe, expect, it } from "vitest";

import { getTestPayload } from "./helpers/payload";

const SLUG = "adopt-testwort";
const SPELLING = "Adopt Testwort";

afterEach(async () => {
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

  it("does not add the entry again when the status is toggled away and back to accepted", async () => {
    const payload = await getTestPayload();
    const word = await liveWord();
    const s = await suggest(word.id);
    await accept(s.id);
    await payload.update({ collection: "suggestions", id: s.id, data: { status: "new" } });
    await accept(s.id);
    expect((await published(word.id)).examples).toHaveLength(1);
  });

  it("refuses to accept suggestions in bulk and changes nothing", async () => {
    const payload = await getTestPayload();
    const word = await liveWord();
    const a = await suggest(word.id, { text: "adopt-test a" });
    const b = await suggest(word.id, { text: "adopt-test b" });
    await expect(
      payload.update({
        collection: "suggestions",
        where: { id: { in: [a.id, b.id] } },
        data: { status: "accepted" },
      }),
    ).rejects.toThrow(/einzeln/);
    for (const { id } of [a, b])
      expect((await payload.findByID({ collection: "suggestions", id, depth: 0 })).status).toBe(
        "new",
      );
    expect((await published(word.id)).examples ?? []).toHaveLength(0);
  });

  it("still lets a bulk update change other fields or reject", async () => {
    const payload = await getTestPayload();
    const word = await liveWord();
    const a = await suggest(word.id, { text: "adopt-test a" });
    const res = await payload.update({
      collection: "suggestions",
      where: { id: { equals: a.id } },
      data: { status: "rejected" },
    });
    expect(res.errors).toHaveLength(0);
    expect(res.docs[0]?.status).toBe("rejected");
  });

  it("keeps both entries when two suggestions for the same word are accepted at the same time", async () => {
    const word = await liveWord();
    const a = await suggest(word.id, { text: "adopt-test a" });
    const b = await suggest(word.id, { text: "adopt-test b" });
    await Promise.all([accept(a.id), accept(b.id)]);
    expect((await published(word.id)).examples?.map((e) => e.example).sort()).toEqual([
      "adopt-test a",
      "adopt-test b",
    ]);
  });

  it("refuses to accept a suggestion that is created already accepted, for the word types that need its id", async () => {
    const payload = await getTestPayload();
    const word = await liveWord();
    await expect(
      payload.create({
        collection: "suggestions",
        data: {
          type: "example",
          targetWord: word.id,
          text: "adopt-test x",
          status: "accepted",
        } as never,
      }),
    ).rejects.toThrow(/erst speichern/i);
    expect((await published(word.id)).examples ?? []).toHaveLength(0);
  });

  it("cuts a suggester name to the 40 characters a credit allows", async () => {
    const word = await liveWord();
    const s = await suggest(word.id, { userName: "N".repeat(100) });
    await accept(s.id);
    expect((await published(word.id)).examples?.[0]?.contributorName).toBe("N".repeat(40));
  });

  it("refuses to accept again with changed text instead of reporting a success that wrote nothing", async () => {
    const payload = await getTestPayload();
    const word = await liveWord();
    const s = await suggest(word.id);
    await accept(s.id);
    await payload.update({
      collection: "suggestions",
      id: s.id,
      data: { status: "new", text: "adopt-test anders" },
    });
    await expect(accept(s.id)).rejects.toThrow(/steht schon im Wort/);
    expect((await published(word.id)).examples?.[0]?.example).toBe("adopt-test Satz");
  });

  it("says so when the target word is gone", async () => {
    const payload = await getTestPayload();
    const word = await liveWord();
    const s = await suggest(word.id);
    await payload.delete({ collection: "words", id: word.id });
    await expect(accept(s.id)).rejects.toThrow(/Wort/);
    expect((await payload.findByID({ collection: "suggestions", id: s.id, depth: 0 })).status).toBe(
      "new",
    );
  });

  it("rolls the word write back when the suggestion save fails after it", async () => {
    const payload = await getTestPayload();
    const word = await liveWord();
    const s = await suggest(word.id);
    // The hook writes the word first; the over-long text then fails the suggestion's own validation.
    await expect(
      payload.update({
        collection: "suggestions",
        id: s.id,
        data: { status: "accepted", text: "x".repeat(300) },
      }),
    ).rejects.toThrow();
    expect((await published(word.id)).examples ?? []).toHaveLength(0);
    expect((await payload.findByID({ collection: "suggestions", id: s.id, depth: 0 })).status).toBe(
      "new",
    );
  });

  it("moves the cache stamp for a new entry but not when the entry is already there", async () => {
    const payload = await getTestPayload();
    const word = await liveWord();
    const s = await suggest(word.id);
    await accept(s.id);
    await payload.update({ collection: "suggestions", id: s.id, data: { status: "new" } });
    await payload.updateGlobal({ slug: "cache-stamp", data: { changedAt: CHANGED } });
    await accept(s.id); // same text: nothing to write
    expect(await stamp()).toBe(CHANGED);
  });
});
