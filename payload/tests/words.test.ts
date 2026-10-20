import { afterEach, describe, expect, it } from "vitest";

import { PRESERVE_CONTENT_MODIFIED_AT } from "../src/fields/contentModified";
import { soundexCode } from "../src/lib/wordDerived";
import { getTestPayload } from "./helpers/payload";

const SLUG = "words-test-aasen";
const clean = async () => {
  const payload = await getTestPayload();
  await payload.delete({ collection: "words", where: { slug: { equals: SLUG } } });
};
afterEach(clean);

const base = { berlinerisch: "Aasen", slug: SLUG };

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
      payload.create({ collection: "words", data: { ...base, _status: "published" } }),
    ).rejects.toThrow(/slug|unique|duplicate/i);
  });

  describe("contentModifiedAt", () => {
    const keep = { context: { [PRESERVE_CONTENT_MODIFIED_AT]: true } };
    const ms = (v?: string | null) => new Date(v!).getTime();
    const A = "2020-01-02T03:04:05.000Z";
    const B = "2021-02-03T04:05:06.000Z";
    const recent = (v?: string | null) => expect(ms(v)).toBeGreaterThan(Date.now() - 60_000);

    it("create with flag keeps the value, without gets now", async () => {
      const payload = await getTestPayload();
      const doc = await payload.create({ collection: "words", data: { ...base, contentModifiedAt: A }, ...keep });
      expect(ms(doc.contentModifiedAt)).toBe(ms(A));
      await clean();
      const plain = await payload.create({ collection: "words", data: { ...base, contentModifiedAt: A } });
      recent(plain.contentModifiedAt);
    });

    it("update with flag and same value keeps it; new value is stored; absent keeps stored", async () => {
      const payload = await getTestPayload();
      const doc = await payload.create({ collection: "words", data: { ...base, contentModifiedAt: A }, ...keep });
      const same = await payload.update({ collection: "words", id: doc.id, data: { contentModifiedAt: A, article: "der" }, ...keep });
      expect(ms(same.contentModifiedAt)).toBe(ms(A));
      const next = await payload.update({ collection: "words", id: doc.id, data: { contentModifiedAt: B }, ...keep });
      expect(ms(next.contentModifiedAt)).toBe(ms(B));
      const absent = await payload.update({ collection: "words", id: doc.id, data: { article: "die" }, ...keep });
      expect(ms(absent.contentModifiedAt)).toBe(ms(B));
    });

    it("update without flag becomes now even when the incoming value equals the stored one", async () => {
      const payload = await getTestPayload();
      const doc = await payload.create({ collection: "words", data: { ...base, contentModifiedAt: A }, ...keep });
      const upd = await payload.update({ collection: "words", id: doc.id, data: { contentModifiedAt: A } });
      recent(upd.contentModifiedAt);
    });
  });

  it("derives fields on create and recomputes them on update", async () => {
    const payload = await getTestPayload();
    const doc = await payload.create({ collection: "words", data: { ...base, berlinerisch: "aasen" } });
    expect(doc.derived?.wordGroup).toBe("A");
    expect(doc.derived?.characterLength).toBe(5);
    expect(doc.derived?.soundexCode).toBe(soundexCode("aasen"));
    const upd = await payload.update({ collection: "words", id: doc.id, data: { berlinerisch: "Bulette" } });
    expect(upd.derived?.wordGroup).toBe("B");
    const other = await payload.update({ collection: "words", id: doc.id, data: { article: "die" } });
    expect(other.derived?.wordGroup).toBe("B");
  });

  it("stores the compound decomposition, empty for a non-compound", async () => {
    const payload = await getTestPayload();
    const doc = await payload.create({ collection: "words", data: { ...base, berlinerisch: "Hodenkobold" } });
    expect(doc.derived?.decomposition).toEqual(["hoden", "kobold"]);
    const upd = await payload.update({ collection: "words", id: doc.id, data: { berlinerisch: "aasen" } });
    expect(upd.derived?.decomposition).toEqual([]);
  });

  it("derives fields on draft saves", async () => {
    const payload = await getTestPayload();
    const doc = await payload.create({ collection: "words", data: { ...base, berlinerisch: "aasen" }, draft: true });
    const upd = await payload.update({ collection: "words", id: doc.id, data: { berlinerisch: "Ärger" }, draft: true });
    expect(upd.derived?.wordGroup).toBe("Ä");
    const latest = await payload.findByID({ collection: "words", id: doc.id, draft: true });
    expect(latest.derived?.wordGroup).toBe("Ä");
  });

  it("overwrites updatedAt on update (why contentModifiedAt exists)", async () => {
    const payload = await getTestPayload();
    const doc = await payload.create({ collection: "words", data: base });
    const upd = await payload.update({ collection: "words", id: doc.id, data: { updatedAt: "2021-02-03T04:05:06.000Z" } });
    expect(upd.updatedAt).not.toBe("2021-02-03T04:05:06.000Z");
  });
});
