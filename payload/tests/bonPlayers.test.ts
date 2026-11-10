import type { Payload } from "payload";

import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { getTestPayload } from "./helpers/payload";

let payload: Payload;
const row = (data: Record<string, unknown> = {}) =>
  payload.create({ collection: "bon-players", data: { codeHash: "h", ...data } as never });

beforeAll(async () => {
  payload = await getTestPayload();
}, 60_000);

afterEach(async () => {
  await payload.delete({ collection: "bon-players", where: { codeHash: { exists: true } } });
});

describe("bon-players", () => {
  it("creates a row with a codeHash", async () => {
    const doc = await row({ name: "Berta" });
    expect(doc.codeHash).toBe("h");
  });

  it("rejects a second row with the same codeHash", async () => {
    await row();
    const err = (await row().catch((e: unknown) => e)) as {
      name: string;
      data?: { errors?: { path: string }[] };
    };
    expect(err.name).toBe("ValidationError");
    // Pinned: Payload reports the DB column name, not the field name.
    expect(err.data?.errors?.[0]?.path).toBe("code_hash");
  });

  it("denies reading without a user", async () => {
    await expect(payload.find({ collection: "bon-players", overrideAccess: false })).rejects.toThrow(
      /not allowed|forbidden/i,
    );
  });
});
