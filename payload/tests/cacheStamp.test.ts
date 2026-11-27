import type { CollectionConfig, PayloadRequest } from "payload";

import { initTransaction, killTransaction } from "payload";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  STAMPED_COLLECTIONS,
  STAMPED_GLOBALS,
  stampCacheChange,
  stampHooks,
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
  await payload.delete({ collection: "redirects", where: { from: { equals: "/stempel-test" } } });
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
  const slugsWhere = (slugs: readonly string[], hasHook: boolean) =>
    slugs.filter((slug) => hooked({ slug, fields: [] }) === hasHook);

  it("hooks the allowlisted collections", () => {
    expect(slugsWhere(STAMPED_COLLECTIONS, true)).toEqual([...STAMPED_COLLECTIONS]);
  });

  it("leaves high-frequency and invisible collections alone", () => {
    const left = [
      "comment-votes",
      "word-stats",
      "word-feedback",
      "bon-games",
      "bon-players",
      "users",
      "suggestions",
      "reports",
      "comment-reports",
    ];
    expect(slugsWhere(left, false)).toEqual(left);
  });

  it("hooks every global except the stamp itself", () => {
    const hookedGlobals = STAMPED_GLOBALS.filter(
      (slug) => (withCacheStampGlobal({ slug, fields: [] }).hooks?.afterChange?.length ?? 0) > 0,
    );
    expect(hookedGlobals).toEqual([...STAMPED_GLOBALS]);
    expect(withCacheStampGlobal({ slug: "cache-stamp", fields: [] }).hooks).toBeUndefined();
  });

  it("keeps the hooks a collection already has", () => {
    const own = vi.fn<() => void>();
    expect(
      withCacheStamp({ slug: "words", fields: [], hooks: { afterChange: [own] } }).hooks
        ?.afterChange?.[0],
    ).toBe(own);
  });
});

describe("stampCacheChange", () => {
  it("writes once per request, however many docs change", async () => {
    const updateGlobal = vi.fn<(args: unknown) => Promise<object>>(async () => ({}));
    const req = { context: {}, payload: { updateGlobal } } as unknown as PayloadRequest;
    await stampCacheChange(req);
    await stampCacheChange(req);
    expect(updateGlobal).toHaveBeenCalledOnce();
    expect(updateGlobal).toHaveBeenCalledWith(
      expect.objectContaining({ req, slug: "cache-stamp" }),
    );
  });
});

describe("cache stamp and comments", () => {
  const setup = async () => {
    const payload = await getTestPayload();
    const word = await payload.create({
      collection: "words",
      data: { berlinerisch: "Stempel", slug: SLUG, _status: "published" },
    });
    const comment = (context: Record<string, unknown> = {}) =>
      payload.create({
        collection: "comments",
        context,
        data: { word: word.id, text: "kiek ma", authorName: "Icke" } as never,
      });
    return { comment, payload };
  };

  it("changes when a comment is published", async () => {
    const { comment } = await setup();
    await setStamp();
    await comment();
    expect(await stamp()).not.toBe(OLD);
  });

  it("does not change for a comment held for review", async () => {
    const { comment } = await setup();
    await setStamp();
    const held = await comment({ review: true });
    expect(held.status).toBe("pending");
    expect(await stamp()).toBe(OLD);
  });

  it("does not change for a vote (the recount only moves counters)", async () => {
    const { comment, payload } = await setup();
    const published = await comment();
    await setStamp();
    await payload.create({
      collection: "comment-votes",
      data: { comment: published.id, visitor: "stamp-v1", value: 1 },
    });
    expect(await stamp()).toBe(OLD);
  });

  it("changes when a recount hides a published comment", async () => {
    const { comment, payload } = await setup();
    const published = await comment();
    await setStamp();
    await payload.update({
      collection: "comments",
      context: { skipCommentHooks: true },
      data: { status: "hidden" },
      id: published.id,
    });
    expect(await stamp()).not.toBe(OLD);
  });
});

// Every collection and global must be decided on: stamps, or is listed here as not changing a public page.
const NOT_PUBLIC_COLLECTIONS = [
  "users", // no public page shows a user
  "suggestions",
  "reports",
  "comment-reports",
  "comment-votes",
  "word-feedback",
  "word-stats",
  "bon-games",
  "bon-players",
  "payload-mcp-api-keys",
  "payload-kv",
  "payload-jobs",
  "payload-locked-documents",
  "payload-preferences",
  "payload-migrations",
];
const NOT_PUBLIC_GLOBALS = ["cache-stamp", "payload-jobs-stats"];

describe("the stamp allowlists in the real config", () => {
  it("decide on every collection and global", async () => {
    const { config } = await getTestPayload();
    const decided = new Set([...STAMPED_COLLECTIONS, ...NOT_PUBLIC_COLLECTIONS]);
    expect(config.collections.map((c) => c.slug).filter((slug) => !decided.has(slug))).toEqual([]);
    const decidedGlobals = new Set([...STAMPED_GLOBALS, ...NOT_PUBLIC_GLOBALS]);
    expect(config.globals.map((g) => g.slug).filter((slug) => !decidedGlobals.has(slug))).toEqual(
      [],
    );
    expect(STAMPED_COLLECTIONS.filter((slug) => NOT_PUBLIC_COLLECTIONS.includes(slug))).toEqual([]);
  });

  it("carry the stamp hooks on every stamped collection and global", async () => {
    const { config } = await getTestPayload();
    const missingCollections = STAMPED_COLLECTIONS.filter((slug) => {
      const hooks = config.collections.find((c) => c.slug === slug)?.hooks;
      return !(
        hooks?.afterChange?.includes(stampHooks.afterChange) &&
        hooks.afterDelete?.includes(stampHooks.afterDelete)
      );
    });
    expect(missingCollections).toEqual([]);
    const missingGlobals = STAMPED_GLOBALS.filter(
      (slug) =>
        !config.globals
          .find((g) => g.slug === slug)
          ?.hooks?.afterChange?.includes(stampHooks.global),
    );
    expect(missingGlobals).toEqual([]);
  });
});

describe("cache stamp, more paths", () => {
  it("changes when a redirect is edited by hand", async () => {
    const payload = await getTestPayload();
    await setStamp();
    await payload.create({
      collection: "redirects",
      data: { from: "/stempel-test", to: { type: "custom", url: "/wort" } } as never,
    });
    expect(await stamp()).not.toBe(OLD);
  });

  it("is rolled back with a global change too", async () => {
    const payload = await getTestPayload();
    await setStamp();
    const req = { payload } as PayloadRequest;
    await initTransaction(req);
    await payload.updateGlobal({
      data: { main: [], footer1: [], footer2: [] },
      req,
      slug: "navigation",
    });
    await killTransaction(req);
    expect(await stamp()).toBe(OLD);
  });

  it("stamps for deleting a published comment, not for a held one", async () => {
    const payload = await getTestPayload();
    const word = await payload.create({
      collection: "words",
      data: { berlinerisch: "Stempel", slug: SLUG, _status: "published" },
    });
    const make = (context: Record<string, unknown> = {}) =>
      payload.create({
        collection: "comments",
        context,
        data: { word: word.id, text: "kiek ma", authorName: "Icke" } as never,
      });
    const held = await make({ review: true });
    await setStamp();
    await payload.delete({ collection: "comments", id: held.id });
    expect(await stamp()).toBe(OLD);
    const published = await make();
    await setStamp();
    await payload.delete({ collection: "comments", id: published.id });
    expect(await stamp()).not.toBe(OLD);
  });

  it("stamps a later doc of the same request when the first write failed", async () => {
    const updateGlobal = vi
      .fn<(args: unknown) => Promise<object>>()
      .mockRejectedValueOnce(new Error("write failed"))
      .mockResolvedValue({});
    const req = { context: {}, payload: { updateGlobal } } as unknown as PayloadRequest;
    await expect(stampCacheChange(req)).rejects.toThrow("write failed");
    await stampCacheChange(req);
    expect(updateGlobal).toHaveBeenCalledTimes(2);
  });

  it("does not stamp when the context says skipCacheStamp (migrations that seed before the table exists)", async () => {
    const updateGlobal = vi.fn<(args: unknown) => Promise<object>>().mockResolvedValue({});
    const req = {
      context: { skipCacheStamp: true },
      payload: { updateGlobal },
    } as unknown as PayloadRequest;
    await stampCacheChange(req);
    expect(updateGlobal).not.toHaveBeenCalled();
  });
});
