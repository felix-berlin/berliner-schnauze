import { afterEach, describe, expect, it } from "vitest";

import { getTestPayload } from "./helpers/payload";

const OLD = "redirects-test-alt";
const NEW = "redirects-test-neu";

afterEach(async () => {
  const payload = await getTestPayload();
  await payload.delete({ collection: "words", where: { slug: { in: [OLD, NEW] } } });
  await payload.delete({ collection: "themen", where: { slug: { in: [OLD, NEW] } } });
  await payload.delete({ collection: "redirects", where: { from: { like: "redirects-test-" } } });
});

const redirectsFrom = async (slug: string) => {
  const payload = await getTestPayload();
  const { docs } = await payload.find({
    collection: "redirects",
    depth: 0,
    where: { from: { equals: `/wort/${slug}` } },
  });
  return docs;
};

const word = async (status: "draft" | "published") =>
  (await getTestPayload()).create({
    collection: "words",
    data: { berlinerisch: "Umbenannt", slug: OLD, wpId: 990301, _status: status },
  });

describe("redirect on slug change", () => {
  it("points the old path of a published word at the word", async () => {
    const payload = await getTestPayload();
    const doc = await word("published");

    await payload.update({
      collection: "words",
      id: doc.id,
      data: { slug: NEW, _status: "published" },
    });

    const [redirect] = await redirectsFrom(OLD);
    expect(redirect?.type).toBe("301");
    expect(redirect?.to).toMatchObject({
      type: "reference",
      reference: { relationTo: "words", value: doc.id },
    });
  });

  it("drops the redirect of a path that becomes live again", async () => {
    const payload = await getTestPayload();
    const doc = await word("published");
    await payload.update({
      collection: "words",
      id: doc.id,
      data: { slug: NEW, _status: "published" },
    });

    await payload.update({
      collection: "words",
      id: doc.id,
      data: { slug: OLD, _status: "published" },
    });

    expect(await redirectsFrom(OLD)).toHaveLength(0);
    expect(await redirectsFrom(NEW)).toHaveLength(1);
  });

  it("adds nothing for a word that was never published", async () => {
    const payload = await getTestPayload();
    const doc = await word("draft");

    await payload.update({ collection: "words", id: doc.id, data: { slug: NEW } });

    expect(await redirectsFrom(OLD)).toHaveLength(0);
  });

  it("adds nothing for a draft save of a published word, only once it is published", async () => {
    const payload = await getTestPayload();
    const doc = await word("published");

    await payload.update({ collection: "words", id: doc.id, data: { slug: NEW }, draft: true });
    expect(await redirectsFrom(OLD)).toHaveLength(0);

    await payload.update({ collection: "words", id: doc.id, data: { _status: "published" } });
    expect(await redirectsFrom(OLD)).toHaveLength(1);
  });

  it("covers collections without drafts (themen)", async () => {
    const payload = await getTestPayload();
    const thema = await payload.create({
      collection: "themen",
      data: { name: "Umbenannt", slug: OLD, wpId: 990302 },
    });

    await payload.update({ collection: "themen", id: thema.id, data: { slug: NEW } });

    const { docs } = await payload.find({
      collection: "redirects",
      depth: 0,
      where: { from: { equals: `/themen/${OLD}` } },
    });
    expect(docs[0]?.to?.reference).toMatchObject({ relationTo: "themen", value: thema.id });
  });
});
