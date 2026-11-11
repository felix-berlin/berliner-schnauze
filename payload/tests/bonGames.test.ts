import type { Payload } from "payload";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

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

  it("accepts a player and saves without one", async () => {
    const player = await payload.create({
      collection: "bon-players",
      data: { codeHash: "game-player" } as never,
    });
    const doc = await row({ player: player.id });
    expect(typeof doc.player === "object" ? doc.player?.id : doc.player).toBe(player.id);
    expect((await row()).player ?? null).toBeNull();
    await payload.delete({ collection: "bon-games", where: { visitor: { like: "v" } } });
    await payload.delete({ collection: "bon-players", where: { id: { equals: player.id } } });
  });

  it("defaults the name flags and mails the editors once, when the reports reach 3", async () => {
    process.env.SUGGEST_MAIL_TO = "editors@example.com";
    const send = vi.spyOn(payload, "sendEmail").mockResolvedValue(undefined as never);
    const doc = await row({ playerName: "Kalle" });
    expect(doc).toMatchObject({ nameHidden: false, nameReports: 0 });
    const report = (n: number) =>
      payload.update({ collection: "bon-games", data: { nameReports: n }, id: doc.id });
    await report(2);
    expect(send).not.toHaveBeenCalled();
    await report(3);
    await report(4);
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0].text).toContain("Name: Kalle");
    send.mockRestore();
  });

  it("denies reading without a user", async () => {
    await expect(payload.find({ collection: "bon-games", overrideAccess: false })).rejects.toThrow(
      /not allowed|forbidden/i,
    );
  });
});
