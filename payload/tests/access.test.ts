import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { mediaRead, usersCreate } from "../src/access";
import { getTestPayload } from "./helpers/payload";

// Task 3 and Task 5 append their collections/globals here.
const lockedCollections = ["users", "words", "word-types", "themen", "posts", "pages", "suggestions", "redirects"] as const;
const lockedGlobals = ["navigation", "affiliate", "company", "home", "anki"] as const;

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

let userId: number | string;
let mediaId: number | string;

beforeAll(async () => {
  const payload = await getTestPayload();
  await payload.delete({ collection: "users", where: { email: { equals: "access@test.local" } } });
  await payload.delete({ collection: "media", where: { wpPath: { in: ["access-test/pixel.png", "access-test/anon.png", "access-test/authed.png"] } } });
  const user = await payload.create({
    collection: "users",
    data: { email: "access@test.local", password: "x".repeat(16), enableAPIKey: true, apiKey: "k-access" },
  });
  userId = user.id;
  const media = await payload.create({
    collection: "media",
    data: { alt: "pixel", wpPath: "access-test/pixel.png" },
    file: { data: png, name: "access-pixel.png", mimetype: "image/png", size: png.length },
  });
  expect(media.alt).toBe("pixel");
  mediaId = media.id;
});

afterAll(async () => {
  const payload = await getTestPayload();
  await payload.delete({ collection: "users", id: userId });
  await payload.delete({ collection: "media", id: mediaId });
});

describe("anonymous reads", () => {
  for (const collection of lockedCollections) {
    it(`${collection} is Forbidden`, async () => {
      const payload = await getTestPayload();
      await expect(payload.find({ collection, overrideAccess: false })).rejects.toThrow(/not allowed|forbidden/i);
    });
  }

  for (const slug of lockedGlobals) {
    it(`global ${slug} is Forbidden`, async () => {
      const payload = await getTestPayload();
      await expect(payload.findGlobal({ slug, overrideAccess: false })).rejects.toThrow(/not allowed|forbidden/i);
    });
  }

  for (const collection of ["words", "posts", "pages"] as const) {
    it(`${collection} versions and count are Forbidden`, async () => {
      const payload = await getTestPayload();
      await expect(payload.findVersions({ collection, overrideAccess: false })).rejects.toThrow(/not allowed|forbidden/i);
      await expect(payload.count({ collection, overrideAccess: false })).rejects.toThrow(/not allowed|forbidden/i);
    });
  }

  it("media listing, findByID and count are Forbidden", async () => {
    const payload = await getTestPayload();
    await expect(payload.find({ collection: "media", overrideAccess: false })).rejects.toThrow(/not allowed|forbidden/i);
    await expect(payload.findByID({ collection: "media", id: mediaId, overrideAccess: false })).rejects.toThrow(/not allowed|forbidden/i);
    await expect(payload.count({ collection: "media", overrideAccess: false })).rejects.toThrow(/not allowed|forbidden/i);
  });

  it("media files stay public (static file reads)", () => {
    expect(mediaRead({ req: { user: null }, isReadingStaticFile: true } as never)).toBe(true);
    expect(mediaRead({ req: { user: null } } as never)).toBe(false);
  });
});

describe("anonymous writes", () => {
  const denied = /not allowed|forbidden/i;
  // id -1 matches nothing: should access ever let a write through, the test fails without touching data
  const nothing = { id: { equals: -1 } };

  for (const collection of lockedCollections) {
    it(`${collection} create, update and delete are Forbidden`, async () => {
      const payload = await getTestPayload();
      await expect(payload.create({ collection, data: {} as never, overrideAccess: false })).rejects.toThrow(denied);
      await expect(payload.update({ collection, data: {}, overrideAccess: false, where: nothing })).rejects.toThrow(denied);
      await expect(payload.delete({ collection, overrideAccess: false, where: nothing })).rejects.toThrow(denied);
    });
  }

  for (const slug of lockedGlobals) {
    it(`global ${slug} update is Forbidden`, async () => {
      const payload = await getTestPayload();
      await expect(payload.updateGlobal({ slug, data: {}, overrideAccess: false })).rejects.toThrow(denied);
    });
  }
});

it("an authenticated user can list media", async () => {
  const payload = await getTestPayload();
  const user = { ...(await payload.findByID({ collection: "users", id: userId })), collection: "users" as const };
  const res = await payload.find({ collection: "media", overrideAccess: false, user });
  expect(res.docs.some((d) => d.id === mediaId)).toBe(true);
});

describe("media writes", () => {
  const file = () => ({ data: png, name: "access-w.png", mimetype: "image/png", size: png.length });
  const denied = /not allowed|forbidden/i;

  it("anonymous create is Forbidden", async () => {
    const payload = await getTestPayload();
    await expect(
      payload.create({ collection: "media", data: { wpPath: "access-test/anon.png" }, file: file(), overrideAccess: false }),
    ).rejects.toThrow(denied);
  });
  it("anonymous update is Forbidden", async () => {
    const payload = await getTestPayload();
    await expect(
      payload.update({ collection: "media", id: mediaId, data: { alt: "x" }, overrideAccess: false }),
    ).rejects.toThrow(denied);
  });
  it("anonymous delete is Forbidden", async () => {
    const payload = await getTestPayload();
    await expect(payload.delete({ collection: "media", id: mediaId, overrideAccess: false })).rejects.toThrow(denied);
  });
  it("authenticated create works", async () => {
    const payload = await getTestPayload();
    const user = await payload.findByID({ collection: "users", id: userId });
    const doc = await payload.create({
      collection: "media",
      data: { wpPath: "access-test/authed.png" },
      file: { ...file(), name: "access-authed.png" },
      overrideAccess: false,
      user: { ...user, collection: "users" },
    });
    expect(doc.id).toBeDefined();
    await payload.delete({ collection: "media", id: doc.id });
  });
});

it("an authenticated user can read users", async () => {
  const payload = await getTestPayload();
  const user = await payload.findByID({ collection: "users", id: userId });
  const res = await payload.find({ collection: "users", overrideAccess: false, user: { ...user, collection: "users" } });
  expect(res.totalDocs).toBeGreaterThan(0);
});

it("an authenticated user can read every locked collection and global", async () => {
  const payload = await getTestPayload();
  const user = { ...(await payload.findByID({ collection: "users", id: userId })), collection: "users" as const };
  for (const collection of lockedCollections) {
    await expect(payload.find({ collection, overrideAccess: false, user })).resolves.toBeDefined();
  }
  for (const slug of lockedGlobals) {
    await expect(payload.findGlobal({ slug, overrideAccess: false, user })).resolves.toBeDefined();
  }
});

describe("users.create bootstrap", () => {
  const req = (user: unknown, totalDocs: number) =>
    ({ user, payload: { count: async () => ({ totalDocs }) } }) as never;
  afterEach(() => vi.unstubAllEnvs());

  it("outside production allows the first user only", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(await usersCreate({ req: req(null, 0) })).toBe(true);
    expect(await usersCreate({ req: req(null, 1) })).toBe(false);
    expect(await usersCreate({ req: req({ id: 1 }, 1) })).toBe(true);
  });
  it("in production needs PAYLOAD_ALLOW_FIRST_USER=true for the first user", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYLOAD_ALLOW_FIRST_USER", "");
    expect(await usersCreate({ req: req(null, 0) })).toBe(false);
    vi.stubEnv("PAYLOAD_ALLOW_FIRST_USER", "true");
    expect(await usersCreate({ req: req(null, 0) })).toBe(true);
    expect(await usersCreate({ req: req(null, 1) })).toBe(false);
    expect(await usersCreate({ req: req({ id: 1 }, 1) })).toBe(true);
  });
});
