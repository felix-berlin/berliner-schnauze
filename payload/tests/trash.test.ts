import type { CollectionSlug, Payload } from "payload";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { preserveOnTrash, touchContentModifiedAt } from "../src/fields/contentModified";
import { getTestPayload } from "./helpers/payload";

let payload: Payload;
const prefix = "trash-test-";

const cases = [
  ["pages", { title: "T" }],
  ["posts", { title: "T", _status: "published" }],
  ["themen", { name: "T" }],
  ["word-types", { name: "T" }],
] as const;

const cleanup = async () => {
  for (const [collection] of cases)
    await payload.delete({
      collection,
      trash: true,
      where: { slug: { like: prefix } },
    } as never);
};

beforeAll(async () => {
  payload = await getTestPayload();
  await cleanup();
}, 60_000);

afterAll(cleanup);

const where = (slug: string) => ({ slug: { equals: slug } });
const trashAt = () => ({ deletedAt: new Date().toISOString() });

describe.each(cases)("%s trash", (collection, fields) => {
  const slug = `${prefix}${collection}`;
  const find = (trash: boolean) =>
    payload.find({ collection: collection as CollectionSlug, trash, where: where(slug) } as never);

  it("hides a trashed doc, brings it back on restore and removes it on a permanent delete", async () => {
    const doc = await payload.create({
      collection: collection as CollectionSlug,
      data: { ...fields, slug },
    } as never);
    const id = (doc as { id: number }).id;
    const update = (data: object) =>
      payload.update({ collection: collection as CollectionSlug, id, data, trash: true } as never);

    await update(trashAt());
    expect((await find(false)).totalDocs).toBe(0);
    expect((await find(true)).totalDocs).toBe(1);

    await update({ deletedAt: null });
    expect((await find(false)).totalDocs).toBe(1);

    await update(trashAt());
    await payload.delete({ collection: collection as CollectionSlug, id, trash: true } as never);
    expect((await find(true)).totalDocs).toBe(0);
  });

  it("explains a slug held by a trashed doc instead of a bare 'must be unique'", async () => {
    const doc = await payload.create({
      collection: collection as CollectionSlug,
      data: { ...fields, slug },
    } as never);
    await payload.update({
      collection: collection as CollectionSlug,
      id: (doc as { id: number }).id,
      data: trashAt(),
    } as never);
    const error = await payload
      .create({ collection: collection as CollectionSlug, data: { ...fields, slug } } as never)
      .then(
        () => null,
        (e: unknown) => e,
      );
    expect(JSON.stringify((error as { data?: unknown })?.data)).toMatch(/Papierkorb/);
    await cleanup();
  });
});

describe("contentModifiedAt", () => {
  const OLD = "2020-01-01T00:00:00.000Z";
  // The hooks in the order the collections run them, sharing one request context.
  const run = (data: Record<string, unknown>, originalDoc: Record<string, unknown>) => {
    const req = { context: {} };
    const args = { data, originalDoc, req } as never;
    return touchContentModifiedAt({
      ...(args as object),
      data: preserveOnTrash(args) as Record<string, unknown>,
    } as never) as Record<string, unknown>;
  };

  it("moves on a content edit", () => {
    expect(run({ title: "neu" }, { contentModifiedAt: OLD }).contentModifiedAt).not.toBe(OLD);
  });

  it.each([
    ["trashing", { deletedAt: "2026-11-19T10:00:00.000Z" }, { deletedAt: null }],
    ["restoring", { deletedAt: null }, { deletedAt: "2026-11-19T10:00:00.000Z" }],
  ])("stays on %s (the sitemap lastmod is about content)", (_name, data, originalDoc) => {
    expect(run(data, { ...originalDoc, contentModifiedAt: OLD }).contentModifiedAt).toBe(OLD);
  });

  it("still moves on an edit that sends the unchanged deletedAt along (the admin form does)", () => {
    const out = run({ deletedAt: null, title: "neu" }, { deletedAt: null, contentModifiedAt: OLD });
    expect(out.contentModifiedAt).not.toBe(OLD);
  });
});
