import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { usersCreate } from "../src/access";
import { getTestPayload } from "./helpers/payload";

// Task 3 and Task 5 append their collections/globals here.
const lockedCollections = ["users"] as const;

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

let userId: number | string;
let mediaId: number | string;

beforeAll(async () => {
  const payload = await getTestPayload();
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

  it("media is readable", async () => {
    const payload = await getTestPayload();
    const res = await payload.find({ collection: "media", overrideAccess: false });
    expect(res.docs.some((d) => d.id === mediaId)).toBe(true);
  });
});

it("an authenticated user can read users", async () => {
  const payload = await getTestPayload();
  const user = await payload.findByID({ collection: "users", id: userId });
  const res = await payload.find({ collection: "users", overrideAccess: false, user: { ...user, collection: "users" } });
  expect(res.totalDocs).toBeGreaterThan(0);
});

describe("users.create bootstrap", () => {
  const req = (user: unknown, totalDocs: number) =>
    ({ user, payload: { count: async () => ({ totalDocs }) } }) as never;
  it("allows the first user only", async () => {
    expect(await usersCreate({ req: req(null, 0) })).toBe(true);
    expect(await usersCreate({ req: req(null, 1) })).toBe(false);
    expect(await usersCreate({ req: req({ id: 1 }, 1) })).toBe(true);
  });
});
