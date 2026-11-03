import { afterEach, describe, expect, it, vi } from "vitest";

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
  const clean = async () => {
    const payload = await getTestPayload();
    await payload.delete({ collection: "suggestions", where: { berlinerWord: { in: [WORD, "Suggestions Test Wort"] } } });
    await payload.delete({ collection: "words", where: { slug: { in: [SLUG, "suggestions-test-woert"] } } });
  };
  afterEach(clean);

  it("lists a word with the same spelling as similar", async () => {
    const payload = await getTestPayload();
    const word = await payload.create({
      collection: "words",
      data: { berlinerisch: "Suggestions-Test-Wort", slug: "suggestions-test-woert" },
    });

    const doc = await payload.create({ collection: "suggestions", data: { ...data, berlinerWord: "Suggestions Test Wort" }, depth: 0 });

    expect(doc.similarWords).toEqual([word.id]);
  });

  it("creates a draft word when accepted without a word, and only once", async () => {
    const payload = await getTestPayload();
    const doc = await payload.create({ collection: "suggestions", data: { ...data, example: "Ein Satz." } });

    const accepted = await payload.update({ collection: "suggestions", id: doc.id, data: { status: "accepted" }, depth: 1 });
    const word = accepted.word as { id: number; _status: string; slug: string; examples: { example: string }[] };
    expect(word.slug).toBe(SLUG);
    expect(word._status).toBe("draft");
    expect(word.examples[0]!.example).toBe("Ein Satz.");

    await payload.update({ collection: "suggestions", id: doc.id, data: { status: "new" } });
    await payload.update({ collection: "suggestions", id: doc.id, data: { status: "accepted" } });
    const { totalDocs } = await payload.count({ collection: "words", where: { slug: { equals: SLUG } } });
    expect(totalDocs).toBe(1);
  });

  it("links a word chosen by hand instead of creating one", async () => {
    const payload = await getTestPayload();
    const word = await payload.create({ collection: "words", data: { berlinerisch: "Vorhanden", slug: SLUG } });
    const doc = await payload.create({ collection: "suggestions", data: data });

    const accepted = await payload.update({ collection: "suggestions", id: doc.id, data: { status: "accepted", word: word.id }, depth: 0 });

    expect(accepted.word).toBe(word.id);
    const { totalDocs } = await payload.count({ collection: "words", where: { slug: { equals: SLUG } } });
    expect(totalDocs).toBe(1);
  });

  it("refuses to accept when the slug is taken and no word was chosen", async () => {
    const payload = await getTestPayload();
    await payload.create({ collection: "words", data: { berlinerisch: "Anders", slug: SLUG } });
    const doc = await payload.create({ collection: "suggestions", data });

    await expect(
      payload.update({ collection: "suggestions", id: doc.id, data: { status: "accepted" } }),
    ).rejects.toThrow(/schon ein Wort/);
  });

  it("locks the suggestion when its word is published, for users too", async () => {
    const payload = await getTestPayload();
    const doc = await payload.create({ collection: "suggestions", data });
    const accepted = await payload.update({ collection: "suggestions", id: doc.id, data: { status: "accepted" }, depth: 0 });
    const wordId = accepted.word as number;

    let again = await payload.findByID({ collection: "suggestions", id: doc.id });
    expect(again.published).toBe(false);

    await payload.update({ collection: "words", id: wordId, data: { _status: "published" } });
    again = await payload.findByID({ collection: "suggestions", id: doc.id });
    expect(again.published).toBe(true);

    const user = { collection: "users", id: 1 } as never;
    await expect(
      payload.update({ collection: "suggestions", id: doc.id, data: { status: "rejected" }, user, overrideAccess: false }),
    ).rejects.toThrow();
  });
});
