import type { APIRoute } from "astro";

import { bonVisitor } from "@services/bonGame.ts";
import { loadPool } from "@services/bonPool.ts";
import { playerFromCookie } from "@services/bonPlayer.ts";
import { getPayloadClient } from "@services/payload.ts";
import { visitorId } from "@services/payload/comments.ts";
import { reply } from "@utils/apiReply.ts";
import { dealBatch, toPublic } from "@utils/bonDeck.ts";
import { randomBytes } from "node:crypto";

const DAY = 24 * 60 * 60_000;

export const POST: APIRoute = async ({ cookies }) => {
  try {
    const cookie = visitorId(cookies, true);
    if (!cookie) throw new Error("no visitor id");
    const visitor = bonVisitor(cookie);
    const payload = await getPayloadClient();
    // Unfinished games never rank; drop everyone's abandoned ones (cookie-less clients get a new visitor per start).
    // Housekeeping must never keep anyone from playing.
    await payload
      .delete({
        collection: "bon-games",
        depth: 0,
        where: {
          createdAt: { less_than: new Date(Date.now() - DAY).toISOString() },
          status: { equals: "playing" },
        },
      })
      .then(({ errors }) => {
        if (errors.length > 0) console.error("[bon] cleanup failed for some games:", errors);
      })
      .catch((error: unknown) => console.error("[bon] cleanup failed:", error));
    const player = await playerFromCookie(payload, cookies);
    const cards = dealBatch(await loadPool(), new Set());
    const game = await payload.create({
      collection: "bon-games",
      data: {
        batches: [{ issuedAt: Date.now(), start: 0 }],
        cards,
        ...(player && { player: player.id }),
        status: "playing",
        token: randomBytes(32).toString("hex"),
        visitor,
      },
      depth: 0,
    });
    return reply({ cards: cards.map((c, i) => toPublic(c, i)), token: game.token }, 200);
  } catch (error) {
    console.error("[bon] start failed:", error);
    return reply({ error: "Die Karten wollten leider nich kommen." }, 502);
  }
};
