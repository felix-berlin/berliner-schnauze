import type { Payload } from "payload";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getTestPayload } from "./helpers/payload";

let payload: Payload;
const slugs = ["related-label-a", "related-label-b"];
const clean = () => payload.delete({ collection: "words", where: { slug: { in: slugs } } });

beforeAll(async () => {
  payload = await getTestPayload();
  await clean();
}, 60_000);
afterAll(clean);

describe("words.related[].label", () => {
  it("lets a row whose linked word was deleted stay saveable, but rejects a new empty row", async () => {
    const target = await payload.create({
      collection: "words",
      data: { berlinerisch: "Zielwort", slug: slugs[1]!, _status: "published" },
    });
    const parent = await payload.create({
      collection: "words",
      data: {
        berlinerisch: "Elternwort",
        slug: slugs[0]!,
        _status: "published",
        related: [{ word: target.id, relation: "verwandt" }],
      },
    });
    await payload.delete({ collection: "words", id: target.id }); // FK nulls related[0].word
    const after = await payload.findByID({ collection: "words", id: parent.id, depth: 0 });
    expect(after.related?.[0]?.word ?? null).toBeNull();

    const saved = await payload.update({
      collection: "words",
      id: parent.id,
      data: { berlinerisch: "Elternwort 2", related: after.related },
    });
    expect(saved.berlinerisch).toBe("Elternwort 2");

    await expect(
      payload.update({
        collection: "words",
        id: parent.id,
        data: { related: [...(after.related ?? []), { relation: "gleich" }] },
      }),
    ).rejects.toThrow(/Wörter \d > Label/);
    await expect(
      payload.create({
        collection: "words",
        data: { berlinerisch: "Neu", slug: "related-label-c", related: [{ relation: "gleich" }] },
      }),
    ).rejects.toThrow(/Wörter \d > Label/);
  });

  it("still enforces maxLength 60", async () => {
    await expect(
      payload.create({
        collection: "words",
        data: {
          berlinerisch: "Lang",
          slug: "related-label-d",
          related: [{ label: "x".repeat(61), relation: "gleich" }],
        },
      }),
    ).rejects.toThrow();
  });
});
