import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { flushIndexNow } from "../src/lib/indexNow";
import { getTestPayload } from "./helpers/payload";

const A = "indexnow-test-a";
const B = "indexnow-test-b";

const fetchSpy = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }));
// Payload's own telemetry also goes through fetch.
const calls = async () => {
  await flushIndexNow();
  return fetchSpy.mock.calls.filter(([url]) => String(url).includes("indexnow"));
};
const pinged = async () =>
  (await calls()).flatMap(([, init]) => (JSON.parse(String(init?.body)) as { urlList: string[] }).urlList.map((u) => new URL(u).pathname));

// Flush queued pings first, or they land after the clear.
const reset = async () => {
  await flushIndexNow();
  fetchSpy.mockClear();
};

beforeEach(async () => {
  process.env.INDEXNOW_KEY = "testkey";
  vi.stubGlobal("fetch", fetchSpy);
  await reset();
});

afterEach(async () => {
  vi.unstubAllGlobals();
  delete process.env.INDEXNOW_KEY;
  const payload = await getTestPayload();
  await payload.delete({ collection: "words", where: { slug: { in: [A, B] } } });
  await payload.delete({ collection: "redirects", where: { from: { like: "indexnow-test-" } } });
});

const create = async (status: "draft" | "published", slug = A) =>
  (await getTestPayload()).create({ collection: "words", data: { berlinerisch: "Ping", slug, _status: status } });

describe("IndexNow pings", () => {
  it("pings a published word, not a draft", async () => {
    await create("draft");
    expect(await calls()).toHaveLength(0);
    await create("published", B);
    expect(await pinged()).toEqual([`/wort/${B}`]);
  });

  it("pings a changed published word and nothing for a draft save of it", async () => {
    const payload = await getTestPayload();
    const word = await create("published");
    await reset();
    await payload.update({ collection: "words", id: word.id, data: { berlinerisch: "Ping2", _status: "draft" }, draft: true });
    expect(await calls()).toHaveLength(0);
    await payload.update({ collection: "words", id: word.id, data: { berlinerisch: "Ping3", _status: "published" } });
    expect(await pinged()).toEqual([`/wort/${A}`]);
  });

  it("pings the old and the new URL after a slug change", async () => {
    const payload = await getTestPayload();
    const word = await create("published");
    await reset();
    await payload.update({ collection: "words", id: word.id, data: { slug: B, _status: "published" } });
    expect((await pinged()).sort()).toEqual([`/wort/${A}`, `/wort/${B}`].sort());
  });

  it("pings the URL on unpublish and on delete", async () => {
    const payload = await getTestPayload();
    const word = await create("published");
    await reset();
    await payload.update({ collection: "words", id: word.id, data: { _status: "draft" } });
    expect(await pinged()).toEqual([`/wort/${A}`]);
    await payload.update({ collection: "words", id: word.id, data: { _status: "published" } });
    await reset();
    await payload.delete({ collection: "words", id: word.id });
    expect(await pinged()).toEqual([`/wort/${A}`]);
  });

  it("does nothing without a key", async () => {
    delete process.env.INDEXNOW_KEY;
    await create("published");
    expect(await calls()).toHaveLength(0);
  });
});
