import { afterEach, describe, expect, it } from "vitest";

import { getTestPayload } from "./helpers/payload";

const SLUG = "words-test-aasen";
const clean = async () => {
  const payload = await getTestPayload();
  await payload.delete({ collection: "words", where: { slug: { equals: SLUG } } });
};
afterEach(clean);

const base = { berlinerisch: "Aasen", slug: SLUG, wpId: 990001 };

describe("words", () => {
  it("defaults to draft", async () => {
    const payload = await getTestPayload();
    const doc = await payload.create({ collection: "words", data: base });
    expect(doc._status).toBe("draft");
  });

  it("rejects a duplicate slug", async () => {
    const payload = await getTestPayload();
    await payload.create({ collection: "words", data: { ...base, _status: "published" } });
    await expect(
      payload.create({ collection: "words", data: { ...base, wpId: 990002, _status: "published" } }),
    ).rejects.toThrow();
  });

  // Payload honors updatedAt on create but overwrites it on update, hence contentModifiedAt.
  it("keeps an explicit contentModifiedAt and bumps it on edits that omit it", async () => {
    const payload = await getTestPayload();
    const at = "2020-01-02T03:04:05.000Z";
    const doc = await payload.create({ collection: "words", data: { ...base, contentModifiedAt: at } });
    expect(doc.contentModifiedAt).toBe(at);
    const at2 = "2021-02-03T04:05:06.000Z";
    const imported = await payload.update({ collection: "words", id: doc.id, data: { contentModifiedAt: at2 } });
    expect(imported.contentModifiedAt).toBe(at2);
    const edited = await payload.update({ collection: "words", id: doc.id, data: { article: "der" } });
    expect(new Date(edited.contentModifiedAt!).getTime()).toBeGreaterThan(Date.now() - 60_000);
  });

  it("overwrites updatedAt on update (why contentModifiedAt exists)", async () => {
    const payload = await getTestPayload();
    const doc = await payload.create({ collection: "words", data: base });
    const upd = await payload.update({ collection: "words", id: doc.id, data: { updatedAt: "2021-02-03T04:05:06.000Z" } });
    expect(upd.updatedAt).not.toBe("2021-02-03T04:05:06.000Z");
  });
});
