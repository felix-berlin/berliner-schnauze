import type { Payload } from "payload";

import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { getTestPayload } from "./helpers/payload";

let payload: Payload;
let n = 0;
const row = (data: Record<string, unknown> = {}) =>
  payload.create({
    collection: "bon-games",
    data: { visitor: `v${n++}`, token: `t${n}`, cards: [], batches: [], ...data } as never,
  });

beforeAll(async () => {
  payload = await getTestPayload();
}, 60_000);

afterEach(async () => {
  await payload.delete({ collection: "bon-games", where: { visitor: { like: "v" } } });
});

describe("bon-games", () => {
  it("creates a row with status playing by default", async () => {
    const doc = await row();
    expect(doc.status).toBe("playing");
  });

  it("rejects a second row with the same token", async () => {
    await row({ token: "same" });
    const err = (await row({ token: "same" }).catch((e: unknown) => e)) as { name: string };
    expect(err.name).toBe("ValidationError");
  });

  it("denies reading without a user", async () => {
    await expect(payload.find({ collection: "bon-games", overrideAccess: false })).rejects.toThrow(
      /not allowed|forbidden/i,
    );
  });
});
