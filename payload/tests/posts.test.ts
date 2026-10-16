import { afterEach, describe, expect, it } from "vitest";

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
});
