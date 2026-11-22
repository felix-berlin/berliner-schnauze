import type { Payload } from "payload";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { getTestPayload } from "./helpers/payload";

const MARK = "sugg-types-test";
let payload: Payload;
let wordId: number;

beforeAll(async () => {
  payload = await getTestPayload();
  await payload.delete({ collection: "words", where: { slug: { equals: MARK } } });
  const w = await payload.create({
    collection: "words",
    data: { berlinerisch: "Typentest", slug: MARK, _status: "published" },
  });
  wordId = w.id;
}, 60_000);

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.SUGGEST_MAIL_TO;
});

afterAll(async () => {
  await payload.delete({ collection: "suggestions", where: { userName: { equals: MARK } } });
  await payload.delete({ collection: "words", where: { id: { equals: wordId } } });
});

const create = (data: Record<string, unknown>) =>
  payload.create({ collection: "suggestions", data: { userName: MARK, ...data } as never });

describe("suggestion types", () => {
  it("defaults to the word type, which still needs berlinerWord and translation", async () => {
    const doc = await create({ berlinerWord: "Typwort", translation: "x" });
    expect(doc.type).toBe("word");
    await expect(create({ translation: "x" })).rejects.toThrow();
    await expect(create({ berlinerWord: "Typwort" })).rejects.toThrow();
  });

  it("takes an example without berlinerWord and translation, but needs text and a target word", async () => {
    const doc = await create({ type: "example", text: "Ick bin da.", targetWord: wordId });
    expect(doc.berlinerWord ?? null).toBeNull();
    await expect(create({ type: "example", targetWord: wordId })).rejects.toThrow();
    await expect(create({ type: "example", text: "Ick bin da." })).rejects.toThrow();
    await expect(
      create({ type: "example", text: "x".repeat(201), targetWord: wordId }),
    ).rejects.toThrow();
    await expect(
      create({ type: "example", text: "ok", highdeutsch: "x".repeat(201), targetWord: wordId }),
    ).rejects.toThrow();
  });

  it("needs a kind for a fact, and allows 1000 characters of text", async () => {
    await create({ type: "fact", kind: "herkunft", text: "x".repeat(1000), targetWord: wordId });
    await expect(create({ type: "fact", text: "x", targetWord: wordId })).rejects.toThrow();
    await expect(
      create({ type: "fact", kind: "nope", text: "x", targetWord: wordId }),
    ).rejects.toThrow();
    await expect(
      create({ type: "fact", kind: "herkunft", text: "x".repeat(1001), targetWord: wordId }),
    ).rejects.toThrow();
  });

  it("needs a relation and a related text (max 60) for a related word", async () => {
    await create({
      type: "related",
      relation: "gegenteil",
      relatedText: "Molle",
      targetWord: wordId,
    });
    await expect(create({ type: "related", relatedText: "Molle" })).rejects.toThrow();
    await expect(create({ type: "related", relation: "gleich" })).rejects.toThrow();
    await expect(
      create({ type: "related", relation: "gleich", relatedText: "x".repeat(61) }),
    ).rejects.toThrow();
  });

  it("does not adopt a non-word suggestion when accepted", async () => {
    const doc = await create({ type: "example", text: "Ick bin da.", targetWord: wordId });
    const before = (await payload.count({ collection: "words", trash: true })).totalDocs;
    const upd = await payload.update({
      collection: "suggestions",
      id: doc.id,
      data: { status: "accepted" },
      depth: 0,
    });
    expect(upd.status).toBe("accepted");
    expect(upd.word ?? null).toBeNull();
    expect((await payload.count({ collection: "words", trash: true })).totalDocs).toBe(before);
  });

  it("stays editable when its target word is published", async () => {
    const doc = await create({ type: "example", text: "Ick bin da.", targetWord: wordId });
    expect(doc.lockedByWord).toBe(false);
    const upd = await payload.update({
      collection: "suggestions",
      id: doc.id,
      data: { text: "Ick bin hier." },
    });
    expect(upd.text).toBe("Ick bin hier.");
  });

  it("stays editable after its target word is deleted, but a new example still needs a target", async () => {
    const slug = `${MARK}-gone`;
    const word = await payload.create({
      collection: "words",
      data: { berlinerisch: "Weg", slug, _status: "published" },
    });
    const doc = await create({ type: "example", text: "Ick bin da.", targetWord: word.id });
    await payload.delete({ collection: "words", id: word.id });
    const upd = await payload.update({
      collection: "suggestions",
      id: doc.id,
      data: { status: "rejected" },
      depth: 0,
    });
    expect(upd.status).toBe("rejected");
    await expect(create({ type: "example", text: "Ick bin da." })).rejects.toThrow();
  });

  it("mails a short type-specific text for a non-word suggestion, with the target word", async () => {
    process.env.SUGGEST_MAIL_TO = "redaktion@example.com";
    const send = vi.spyOn(payload, "sendEmail").mockResolvedValue(undefined);
    await create({
      type: "fact",
      kind: "herkunft",
      text: "Kommt aus dem Jiddischen.",
      targetWord: wordId,
      userMail: "fan@example.com",
    });
    await create({
      type: "related",
      relation: "gegenteil",
      relatedText: "Molle",
      targetWord: wordId,
    });
    const [fact, related] = send.mock.calls.map(
      (c) => c[0] as { replyTo?: string; subject: string; text: string; to: string },
    );
    expect(send).toHaveBeenCalledTimes(2);
    expect(fact!.to).toBe("redaktion@example.com");
    expect(fact!.replyTo).toBe("fan@example.com");
    expect(fact!.subject).toContain("Wissenswertes");
    expect(fact!.text).toContain("Typentest");
    expect(fact!.text).toContain("Kommt aus dem Jiddischen.");
    expect(fact!.text).not.toContain("neues Berliner Wort");
    expect(related!.text).toContain("Molle");
    expect(related!.text).toContain("Gegenteil");
  });

  it("gives every type a title for the admin list", async () => {
    const word = await create({ berlinerWord: "Titelwort", translation: "x" });
    const example = await create({ type: "example", text: "Ick bin da.", targetWord: wordId });
    const related = await create({
      type: "related",
      relation: "gleich",
      relatedText: "Molle",
      targetWord: wordId,
    });
    const fact = await create({
      type: "fact",
      kind: "herkunft",
      text: "y".repeat(500),
      targetWord: wordId,
    });
    const title = async (id: number) =>
      ((await payload.findByID({ collection: "suggestions", id, depth: 0 })) as { title?: string })
        .title;
    expect(await title(word.id)).toBe("Titelwort");
    expect(await title(example.id)).toContain("Ick bin da.");
    expect(await title(related.id)).toContain("Molle");
    expect((await title(fact.id))!.length).toBeLessThan(100);
  });
});
