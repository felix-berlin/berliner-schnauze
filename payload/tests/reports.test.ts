import type { Payload } from "payload";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getTestPayload } from "./helpers/payload";

let payload: Payload;
let wordId: number;

beforeAll(async () => {
  payload = await getTestPayload();
  await payload.delete({ collection: "words", where: { slug: { equals: "reports-test-wort" } } });
  const w = await payload.create({
    collection: "words",
    data: { berlinerisch: "Meldetest", slug: "reports-test-wort", _status: "published" },
  });
  wordId = w.id;
}, 60_000);

afterAll(async () => {
  await payload.delete({ collection: "reports", where: { word: { equals: wordId } } });
  await payload.delete({ collection: "words", where: { id: { equals: wordId } } });
});

const report = (data: Record<string, unknown> = {}) =>
  payload.create({
    collection: "reports",
    data: { word: wordId, kind: "meaning", text: "stimmt nich", ...data } as never,
  });

describe("reports", () => {
  it("defaults to open", async () => {
    expect((await report()).status).toBe("open");
  });

  it("requires text", async () => {
    await expect(report({ text: undefined })).rejects.toThrow();
  });

  it("rejects text over 1000 characters", async () => {
    await expect(report({ text: "x".repeat(1001) })).rejects.toThrow();
    await expect(report({ text: "x".repeat(1000) })).resolves.toBeTruthy();
  });

  it("clears the e-mail when the report is closed", async () => {
    const r = await report({ email: "a@b.de" });
    expect(r.email).toBe("a@b.de");
    const closed = await payload.update({
      collection: "reports",
      id: r.id,
      data: { status: "closed" },
    });
    expect(closed.email ?? null).toBeNull();
  });

  it("clears the e-mail on a later update of a closed report", async () => {
    const r = await report({ email: "a@b.de" });
    await payload.update({ collection: "reports", id: r.id, data: { status: "closed" } });
    const again = await payload.update({
      collection: "reports",
      id: r.id,
      data: { email: "c@d.de" },
    });
    expect(again.email ?? null).toBeNull();
  });

  it("clears the e-mail of a report created closed", async () => {
    const r = await report({ email: "a@b.de", status: "closed" });
    expect(r.email ?? null).toBeNull();
  });

  it("is not readable without login", async () => {
    await expect(payload.find({ collection: "reports", overrideAccess: false })).rejects.toThrow(
      /not allowed|forbidden/i,
    );
  });

  it("does not accept an emptied kind or status", async () => {
    const r = await report();
    await expect(
      payload.update({ collection: "reports", id: r.id, data: { status: null } as never }),
    ).rejects.toThrow(/field is invalid: Status/);
    await expect(
      payload.update({ collection: "reports", id: r.id, data: { kind: null } as never }),
    ).rejects.toThrow(/field is invalid: Art/);
  });
});
