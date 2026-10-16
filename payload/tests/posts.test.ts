import { afterEach, describe, expect, it } from "vitest";

import { PRESERVE_CONTENT_MODIFIED_AT } from "../src/fields/contentModified";
import { getTestPayload } from "./helpers/payload";

const SLUG = "posts-test-hallo";
afterEach(async () => {
  const payload = await getTestPayload();
  await payload.delete({ collection: "posts", where: { slug: { equals: SLUG } } });
});

const base = { title: "Hallo", slug: SLUG, wpId: 990101 };

describe("posts", () => {
  it("defaults to draft", async () => {
    const payload = await getTestPayload();
    const doc = await payload.create({ collection: "posts", data: base });
    expect(doc._status).toBe("draft");
  });

  it("rejects a duplicate published slug", async () => {
    const payload = await getTestPayload();
    await payload.create({ collection: "posts", data: { ...base, _status: "published" } });
    await expect(
      payload.create({ collection: "posts", data: { ...base, wpId: 990102, _status: "published" } }),
    ).rejects.toThrow(/slug|unique|duplicate/i);
  });

  describe("contentModifiedAt", () => {
    const keep = { context: { [PRESERVE_CONTENT_MODIFIED_AT]: true } };
    const ms = (v?: string | null) => new Date(v!).getTime();
    const A = "2020-01-02T03:04:05.000Z";

    it("create with flag keeps the value; update without flag becomes now", async () => {
      const payload = await getTestPayload();
      const doc = await payload.create({ collection: "posts", data: { ...base, contentModifiedAt: A }, ...keep });
      expect(ms(doc.contentModifiedAt)).toBe(ms(A));
      const kept = await payload.update({ collection: "posts", id: doc.id, data: { excerpt: "x" }, ...keep });
      expect(ms(kept.contentModifiedAt)).toBe(ms(A));
      const upd = await payload.update({ collection: "posts", id: doc.id, data: { contentModifiedAt: A } });
      expect(ms(upd.contentModifiedAt)).toBeGreaterThan(Date.now() - 60_000);
    });
  });
});
