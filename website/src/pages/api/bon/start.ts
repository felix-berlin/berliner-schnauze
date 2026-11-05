import type { APIRoute } from "astro";

import { bonVisitor } from "@services/bonGame.ts";
import { loadPool } from "@services/bonPool.ts";
import { getPayloadClient } from "@services/payload.ts";
import { visitorId } from "@services/payload/comments.ts";
import { isUniqueViolation, reply } from "@utils/apiReply.ts";
import { dealBatch, toPublic } from "@utils/bonDeck.ts";
import { randomBytes } from "node:crypto";

const DAY = 24 * 60 * 60_000;

export const POST: APIRoute = async ({ cookies }) => {
  try {
    const cookie = visitorId(cookies, true);
    if (!cookie) throw new Error("no visitor id");
    const visitor = bonVisitor(cookie);
    const payload = await getPayloadClient();
    // Unfinished games never rank; drop this visitor's abandoned ones.
    await payload.delete({
      collection: "bon-games",
      depth: 0,
      where: {
        createdAt: { less_than: new Date(Date.now() - DAY).toISOString() },
        status: { equals: "playing" },
        visitor: { equals: visitor },
      },
    });
    const cards = dealBatch(await loadPool(), new Set());
    const create = () =>
      payload.create({
        collection: "bon-games",
        data: {
          batches: [{ issuedAt: Date.now(), start: 0 }],
          cards,
          status: "playing",
          token: randomBytes(32).toString("hex"),
          visitor,
        },
        depth: 0,
      });
    let game;
    try {
      game = await create();
    } catch (error) {
      if (!isUniqueViolation(error, "token")) throw error;
      game = await create();
    }
    return reply({ cards: cards.map(toPublic), token: game.token }, 200);
  } catch (error) {
    console.error("[bon] start failed:", error);
    return reply({ error: "Die Karten wollten leider nich kommen." }, 502);
  }
};
