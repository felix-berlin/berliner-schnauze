import type { CollectionConfig, PayloadRequest } from "payload";

import { initTransaction, killTransaction } from "payload";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  STAMPED_COLLECTIONS,
  STAMPED_GLOBALS,
  stampCacheChange,
  withCacheStamp,
  withCacheStampGlobal,
} from "../src/hooks/cacheStamp";
import { getTestPayload } from "./helpers/payload";

const SLUG = "cache-stamp-test";
const OLD = "2020-01-01T00:00:00.000Z";

const setStamp = async () =>
  (await getTestPayload()).updateGlobal({ slug: "cache-stamp", data: { changedAt: OLD } });
const stamp = async () =>
  ((await (await getTestPayload()).findGlobal({ slug: "cache-stamp" })).changedAt ?? null) as
    | string
    | null;

afterEach(async () => {
  const payload = await getTestPayload();
  await payload.delete({ collection: "words", where: { slug: { equals: SLUG } } });
});

describe("cache stamp", () => {
  it("changes when a word is created", async () => {
    await setStamp();
    await (
      await getTestPayload()
    ).create({ collection: "words", data: { berlinerisch: "Stempel", slug: SLUG } });
    expect(await stamp()).not.toBe(OLD);
  });

  it("changes when a word is deleted", async () => {
    const payload = await getTestPayload();
    await payload.create({ collection: "words", data: { berlinerisch: "Stempel", slug: SLUG } });
    await setStamp();
    await payload.delete({ collection: "words", where: { slug: { equals: SLUG } } });
    expect(await stamp()).not.toBe(OLD);
  });

  it("changes when a global changes", async () => {
    const payload = await getTestPayload();
    await setStamp();
    await payload.updateGlobal({
      slug: "navigation",
      data: { main: [], footer1: [], footer2: [] },
    });
    expect(await stamp()).not.toBe(OLD);
  });

  it("does not stamp itself", async () => {
    await setStamp();
    expect(await stamp()).toBe(OLD);
  });

  it("is rolled back with the change it belongs to", async () => {
    const payload = await getTestPayload();
    await setStamp();
    const req = { payload } as PayloadRequest;
    await initTransaction(req);
    await payload.create({
      collection: "words",
      data: { berlinerisch: "Stempel", slug: SLUG },
      req,
    });
    await killTransaction(req);
    expect(await stamp()).toBe(OLD);
  });
});

describe("withCacheStamp", () => {
  const hooked = (collection: CollectionConfig) =>
    (withCacheStamp(collection).hooks?.afterChange?.length ?? 0) > 0;

  it("hooks the allowlisted collections", () => {
    for (const slug of STAMPED_COLLECTIONS) expect(hooked({ slug, fields: [] }), slug).toBe(true);
  });

  it("leaves high-frequency and invisible collections alone", () => {
    for (const slug of [
      "comment-votes",
      "word-stats",
      "word-feedback",
      "bon-games",
      "bon-players",
      "users",
      "suggestions",
      "reports",
      "comment-reports",
    ])
      expect(hooked({ slug, fields: [] }), slug).toBe(false);
  });

  it("hooks every global except the stamp itself", () => {
    for (const slug of STAMPED_GLOBALS)
      expect(
        withCacheStampGlobal({ slug, fields: [] }).hooks?.afterChange?.length,
        slug,
      ).toBeGreaterThan(0);
    expect(withCacheStampGlobal({ slug: "cache-stamp", fields: [] }).hooks).toBeUndefined();
  });

  it("keeps the hooks a collection already has", () => {
    const own = vi.fn();
    expect(
      withCacheStamp({ slug: "words", fields: [], hooks: { afterChange: [own] } }).hooks
        ?.afterChange?.[0],
    ).toBe(own);
  });
});

describe("stampCacheChange", () => {
  it("writes once per request, however many docs change", async () => {
    const updateGlobal = vi.fn(async () => ({}));
    const req = { context: {}, payload: { updateGlobal } } as unknown as PayloadRequest;
    await stampCacheChange(req);
    await stampCacheChange(req);
    expect(updateGlobal).toHaveBeenCalledOnce();
    expect(updateGlobal).toHaveBeenCalledWith(
      expect.objectContaining({ req, slug: "cache-stamp" }),
    );
  });
});
