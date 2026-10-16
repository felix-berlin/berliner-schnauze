import type { Payload } from "payload";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { assertLocalDatabase, E2E_WORD_SLUGS, SEEDED, seededSlugs, seedE2e } from "../src/seed/e2e";
import { getTestPayload } from "./helpers/payload";

let payload: Payload;

/** The test database is shared: take the seeded data out again, other test files create words like `aasen` themselves. */
const cleanup = async () => {
  const { themen, words } = seededSlugs();
  await payload.delete({ collection: "words", where: { slug: { in: words } } });
  await payload.delete({ collection: "themen", where: { slug: { in: themen } } });
  await payload.delete({ collection: "posts", where: { slug: { in: SEEDED.posts } } });
  await payload.delete({ collection: "pages", where: { slug: { in: SEEDED.pages } } });
  await payload.delete({ collection: "media", where: { wpPath: { in: SEEDED.media } } });
};

beforeAll(async () => {
  payload = await getTestPayload();
  await cleanup();
  await seedE2e(payload);
  await seedE2e(payload); // twice: must not duplicate anything
}, 120_000);

afterAll(cleanup);

const slugs = async (collection: "words" | "themen" | "posts" | "pages") =>
  (await payload.find({ collection, depth: 0, draft: true, limit: 500, pagination: false })).docs.map((d) => (d as { slug?: string | null }).slug);

describe("seedE2e", () => {
  it("creates every word the specs navigate to, once", async () => {
    const found = await slugs("words");
    for (const slug of E2E_WORD_SLUGS) expect(found.filter((s) => s === slug)).toHaveLength(1);
    expect(new Set(found).size).toBe(found.length);
  });

  it("publishes the words and fills the derived fields through the save hook", async () => {
    const { docs } = await payload.find({ collection: "words", where: { slug: { equals: "anmachen" } }, depth: 0 });
    expect(docs[0]._status).toBe("published");
    expect(docs[0].derived?.wordGroup).toBe("A");
    expect(docs[0].derived?.soundexCode).toBeTruthy();
  });

  it("links related words and marks the berolinismus", async () => {
    const { docs } = await payload.find({ collection: "words", where: { slug: { equals: "ballast-der-republik" } }, depth: 1 });
    const related = (docs[0].relatedWords ?? []).map((w) => (typeof w === "object" ? w.slug : w));
    expect(related.length).toBeGreaterThan(0);
    const alex = await payload.find({ collection: "words", where: { slug: { equals: "alex" } }, depth: 0 });
    expect(alex.docs[0].berolinismus).toBe(true);
  });

  it("gives akademiebusen a gallery image", async () => {
    const { docs } = await payload.find({ collection: "words", where: { slug: { equals: "akademiebusen" } }, depth: 1 });
    expect(docs[0].images?.length).toBeGreaterThan(0);
  });

  it("has an anagram pair and a similar-sounding neighbour for the phonology specs", async () => {
    const found = await slugs("words");
    expect(found).toEqual(expect.arrayContaining(["alsche", "schale", "anmachen", "anmachn"]));
    const { docs } = await payload.find({ collection: "words", where: { slug: { in: ["anmachen", "anmachn"] } }, depth: 0 });
    expect(new Set(docs.map((d) => d.derived?.soundexCode)).size).toBe(1);
  });

  it("creates at least ten themen, a published post and the legal pages", async () => {
    expect((await slugs("themen")).length).toBeGreaterThanOrEqual(10);
    expect((await payload.find({ collection: "posts", where: { _status: { equals: "published" } }, depth: 0 })).totalDocs).toBeGreaterThanOrEqual(1);
    expect(await slugs("pages")).toEqual(expect.arrayContaining(["datenschutz", "impressum"]));
  });

  it("fills the site globals", async () => {
    expect((await payload.findGlobal({ slug: "navigation" })).main?.length).toBeGreaterThan(0);
    expect((await payload.findGlobal({ slug: "company" })).funding?.length).toBeGreaterThan(0);
  });
});

describe("assertLocalDatabase", () => {
  it("accepts local hosts", () => {
    expect(() => assertLocalDatabase("postgres://u:p@localhost:5432/bs_e2e")).not.toThrow();
    expect(() => assertLocalDatabase("postgres://u:p@127.0.0.1/bs_e2e")).not.toThrow();
  });

  it.each(["postgres://u:p@db.prod.example/berliner_schnauze", "", "not a url"])("refuses %j: the seed writes invented words", (url) => {
    expect(() => assertLocalDatabase(url)).toThrow();
  });
});
