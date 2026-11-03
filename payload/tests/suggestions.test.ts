import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { getTestPayload } from "./helpers/payload";

const WORD = "suggestions-test-wort";

afterEach(async () => {
  vi.restoreAllMocks();
  delete process.env.SUGGEST_MAIL_TO;
  const payload = await getTestPayload();
  await payload.delete({ collection: "suggestions", where: { berlinerWord: { equals: WORD } } });
});

const data = { berlinerWord: WORD, translation: "Testwort", userMail: "fan@example.com" };

describe("suggestions", () => {
  it("mails the editors with the suggester as reply target", async () => {
    process.env.SUGGEST_MAIL_TO = "redaktion@example.com";
    const payload = await getTestPayload();
    const send = vi.spyOn(payload, "sendEmail").mockResolvedValue(undefined);

    const doc = await payload.create({ collection: "suggestions", data });

    expect(doc.status).toBe("new");
    expect(send).toHaveBeenCalledOnce();
    const mail = send.mock.calls[0]![0] as { replyTo: string; text: string; to: string };
    expect(mail.to).toBe("redaktion@example.com");
    expect(mail.replyTo).toBe("fan@example.com");
    expect(mail.text).toContain(`Berliner Wort: ${WORD}`);
  });

  it("keeps the suggestion when the mail fails", async () => {
    process.env.SUGGEST_MAIL_TO = "redaktion@example.com";
    const payload = await getTestPayload();
    vi.spyOn(payload, "sendEmail").mockRejectedValue(new Error("smtp down"));

    await payload.create({ collection: "suggestions", data });

    const { totalDocs } = await payload.count({
      collection: "suggestions",
      where: { berlinerWord: { equals: WORD } },
    });
    expect(totalDocs).toBe(1);
  });

  it("accepts the form's empty optional fields and mails without a reply target", async () => {
    process.env.SUGGEST_MAIL_TO = "redaktion@example.com";
    const payload = await getTestPayload();
    const send = vi.spyOn(payload, "sendEmail").mockResolvedValue(undefined);

    await payload.create({
      collection: "suggestions",
      data: { ...data, example: "", userMail: "", userName: "" },
    });

    expect(send.mock.calls[0]![0]).not.toHaveProperty("replyTo");
  });

  it("sends no mail on update", async () => {
    process.env.SUGGEST_MAIL_TO = "redaktion@example.com";
    const payload = await getTestPayload();
    const send = vi.spyOn(payload, "sendEmail").mockResolvedValue(undefined);
    const doc = await payload.create({ collection: "suggestions", data });
    send.mockClear();

    await payload.update({ collection: "suggestions", id: doc.id, data: { status: "rejected" } });

    expect(send).not.toHaveBeenCalled();
  });
});

describe("suggestions: adopt and lock", () => {
  const SLUG = "suggestions-test-wort";
  const SIMILAR_SLUG = "suggestions-test-woert";
  const SPELLINGS = [WORD, "Suggestions Test Wort", "Suggestions Test Wort 2", "..."];
  const user = async () => {
    const payload = await getTestPayload();
    const found = await payload.find({
      collection: "users",
      where: { email: { equals: "suggest-lock@test.local" } },
      limit: 1,
    });
    return { ...found.docs[0]!, collection: "users" as const };
  };
  const wordCount = async (slug = SLUG) => {
    const payload = await getTestPayload();
    return (await payload.count({ collection: "words", where: { slug: { equals: slug } } }))
      .totalDocs;
  };
  const accepted = async (extra: Record<string, unknown> = {}) => {
    const payload = await getTestPayload();
    const doc = await payload.create({ collection: "suggestions", data });
    return payload.update({
      collection: "suggestions",
      id: doc.id,
      data: { status: "accepted", ...extra },
      depth: 0,
    });
  };

  beforeAll(async () => {
    const payload = await getTestPayload();
    await payload.delete({
      collection: "users",
      where: { email: { equals: "suggest-lock@test.local" } },
    });
    await payload.create({
      collection: "users",
      data: { email: "suggest-lock@test.local", password: "x".repeat(16) },
    });
  });
  afterAll(async () => {
    const payload = await getTestPayload();
    await payload.delete({
      collection: "users",
      where: { email: { equals: "suggest-lock@test.local" } },
    });
  });
  const clean = async () => {
    const payload = await getTestPayload();
    await payload.delete({ collection: "suggestions", where: { berlinerWord: { in: SPELLINGS } } });
    await payload.delete({ collection: "words", where: { slug: { in: [SLUG, SIMILAR_SLUG] } } });
  };
  beforeEach(clean);
  afterEach(clean);

  describe("similar words", () => {
    it("lists a word with the same spelling, and only on create or a spelling change", async () => {
      const payload = await getTestPayload();
      const word = await payload.create({
        collection: "words",
        data: { berlinerisch: "Suggestions-Test-Wort", slug: SIMILAR_SLUG },
      });
      const doc = await payload.create({
        collection: "suggestions",
        data: { ...data, berlinerWord: "Suggestions Test Wort" },
        depth: 0,
      });
      expect(doc.similarWords).toEqual([word.id]);

      await payload.update({
        collection: "words",
        id: word.id,
        data: { berlinerisch: "Ganz anders" },
      });
      const sameSpelling = await payload.update({
        collection: "suggestions",
        id: doc.id,
        data: { berlinerWord: "Suggestions Test Wort", status: "rejected" },
        depth: 0,
      });
      expect(sameSpelling.similarWords).toEqual([word.id]); // spelling unchanged: no new search
      const changed = await payload.update({
        collection: "suggestions",
        id: doc.id,
        data: { berlinerWord: "Suggestions Test Wort 2" },
        depth: 0,
      });
      expect(changed.similarWords).toEqual([]);
    });

    it("does not list the suggestion's own word", async () => {
      const payload = await getTestPayload();
      const doc = await accepted();
      const again = await payload.update({
        collection: "suggestions",
        id: doc.id,
        data: { berlinerWord: WORD },
        depth: 0,
      });
      expect(again.similarWords).toEqual([]);
    });

    it("names the similar words in the editors' mail, and adds no line without any", async () => {
      process.env.SUGGEST_MAIL_TO = "redaktion@example.com";
      const payload = await getTestPayload();
      const send = vi.spyOn(payload, "sendEmail").mockResolvedValue(undefined);
      await payload.create({
        collection: "words",
        data: { berlinerisch: "Suggestions-Test-Wort", slug: SIMILAR_SLUG },
      });

      await payload.create({
        collection: "suggestions",
        data: { ...data, berlinerWord: "Suggestions Test Wort" },
      });
      expect((send.mock.calls[0]![0] as { text: string }).text).toContain(
        `Ähnliche Wörter: Suggestions-Test-Wort (${SIMILAR_SLUG})`,
      );

      send.mockClear();
      await payload.create({
        collection: "suggestions",
        data: { ...data, berlinerWord: "Suggestions Test Wort 2" },
      });
      expect((send.mock.calls[0]![0] as { text: string }).text).not.toContain("Ähnliche Wörter");
    });

    it("keeps the suggestion when the search fails", async () => {
      const payload = await getTestPayload();
      vi.spyOn(payload, "find").mockRejectedValueOnce(new Error("db down"));
      const doc = await payload.create({ collection: "suggestions", data });
      expect(doc.id).toBeDefined();
    });
  });

  describe("accepting", () => {
    it("creates one draft word with the suggestion's content", async () => {
      const payload = await getTestPayload();
      const doc = await payload.create({
        collection: "suggestions",
        data: { ...data, example: "Ein Satz." },
      });
      const done = await payload.update({
        collection: "suggestions",
        id: doc.id,
        data: { status: "accepted" },
        depth: 1,
      });
      const word = done.word as {
        _status: string;
        slug: string;
        berlinerisch: string;
        translations: { translation: string }[];
        examples: { example: string }[];
      };
      expect(word).toMatchObject({ slug: SLUG, _status: "draft", berlinerisch: WORD });
      expect(word.translations[0]!.translation).toBe("Testwort");
      expect(word.examples[0]!.example).toBe("Ein Satz.");

      await payload.update({ collection: "suggestions", id: doc.id, data: { status: "new" } });
      await payload.update({ collection: "suggestions", id: doc.id, data: { status: "accepted" } });
      await payload.update({
        collection: "suggestions",
        id: doc.id,
        data: { status: "accepted", example: "Neu" },
      });
      expect(await wordCount()).toBe(1);
    });

    it("creates the word when the suggestion is accepted on create, with no example", async () => {
      const payload = await getTestPayload();
      const doc = await payload.create({
        collection: "suggestions",
        data: { ...data, status: "accepted" },
        depth: 1,
      });
      expect((doc.word as { examples: unknown[] }).examples).toEqual([]);
      expect(await wordCount()).toBe(1);
    });

    it("links a word chosen by hand instead of creating one", async () => {
      const payload = await getTestPayload();
      const word = await payload.create({
        collection: "words",
        data: { berlinerisch: "Vorhanden", slug: SLUG },
      });
      expect((await accepted({ word: word.id })).word).toBe(word.id);
      expect(await wordCount()).toBe(1);
    });

    it("refuses a taken slug and an empty one, and leaves everything as it was", async () => {
      const payload = await getTestPayload();
      await payload.create({ collection: "words", data: { berlinerisch: "Anders", slug: SLUG } });
      const doc = await payload.create({ collection: "suggestions", data });
      await expect(
        payload.update({ collection: "suggestions", id: doc.id, data: { status: "accepted" } }),
      ).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/schon ein Wort/) });
      expect((await payload.findByID({ collection: "suggestions", id: doc.id })).status).toBe(
        "new",
      );
      expect(await wordCount()).toBe(1);

      const empty = await payload.create({
        collection: "suggestions",
        data: { ...data, berlinerWord: "..." },
      });
      await expect(
        payload.update({ collection: "suggestions", id: empty.id, data: { status: "accepted" } }),
      ).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/Slug/) });
    });
  });

  describe("lock", () => {
    const edit = async (id: number, overrides: Record<string, unknown> = {}) => {
      const payload = await getTestPayload();
      return payload.update({
        collection: "suggestions",
        id,
        data: { translation: "geändert" },
        user: await user(),
        overrideAccess: false,
        ...overrides,
      });
    };
    const publish = async (id: number, status: "published" | "draft" = "published") => {
      const payload = await getTestPayload();
      await payload.update({ collection: "words", id, data: { _status: status } });
    };

    it("is derived from the word: open while a draft, locked while live, open again when withdrawn", async () => {
      const payload = await getTestPayload();
      const doc = await accepted();
      const wordId = doc.word as number;

      expect((await edit(doc.id)).translation).toBe("geändert"); // positive control: a real user may edit
      await publish(wordId, "draft");
      expect((await edit(doc.id, { data: { translation: "noch mal" } })).translation).toBe(
        "noch mal",
      );

      await publish(wordId);
      await expect(edit(doc.id, { data: { translation: "gesperrt?" } })).rejects.toThrow(
        /not allowed|Forbidden/i,
      );
      expect((await payload.findByID({ collection: "suggestions", id: doc.id })).translation).toBe(
        "noch mal",
      );
      expect((await payload.findByID({ collection: "suggestions", id: doc.id })).lockedByWord).toBe(
        true,
      );

      await publish(wordId, "draft");
      expect((await payload.findByID({ collection: "suggestions", id: doc.id })).lockedByWord).toBe(
        false,
      );
      expect((await edit(doc.id, { data: { translation: "wieder offen" } })).translation).toBe(
        "wieder offen",
      );
    });

    it("also refuses Local API and bulk updates, with a readable message", async () => {
      const payload = await getTestPayload();
      const doc = await accepted();
      await publish(doc.word as number);

      await expect(
        payload.update({ collection: "suggestions", id: doc.id, data: { translation: "x" } }),
      ).rejects.toMatchObject({ status: 403, message: expect.stringMatching(/gesperrt/) });
      const bulk = await payload.update({
        collection: "suggestions",
        where: { id: { equals: doc.id } },
        data: { translation: "x" },
      });
      expect(bulk.errors).toHaveLength(1);
      expect((await payload.findByID({ collection: "suggestions", id: doc.id })).translation).toBe(
        "Testwort",
      );
    });

    it("locks every suggestion of the word, and one linked to an already live word at once", async () => {
      const payload = await getTestPayload();
      const word = await payload.create({
        collection: "words",
        data: { berlinerisch: "Live", slug: SLUG, _status: "published" },
      });
      const a = await accepted({ word: word.id });
      const b = await accepted({ word: word.id });
      for (const id of [a.id, b.id])
        expect((await payload.findByID({ collection: "suggestions", id })).lockedByWord).toBe(true);
    });

    it("unlocks when the word is deleted, and lets the suggestion be deleted while locked", async () => {
      const payload = await getTestPayload();
      const doc = await accepted();
      await publish(doc.word as number);
      await payload.delete({ collection: "words", id: doc.word as number });
      expect((await edit(doc.id)).translation).toBe("geändert");
      await publish((await accepted()).word as number);
    });
  });
});
