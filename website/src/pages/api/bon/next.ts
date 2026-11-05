import type { APIRoute } from "astro";

import { bonVisitor, findGame } from "@services/bonGame.ts";
import { loadPool } from "@services/bonPool.ts";
import { getPayloadClient } from "@services/payload.ts";
import { visitorId } from "@services/payload/comments.ts";
import { reply } from "@utils/apiReply.ts";
import { dealBatch, toPublic } from "@utils/bonDeck.ts";
import { nextSchema } from "@utils/bonSchema.ts";

const MAX_BATCHES = 50;

export const POST: APIRoute = async ({ cookies, request }) => {
  const input = nextSchema.safeParse(await request.json().catch(() => undefined));
  if (!input.success) return reply({ error: "Ungültige Eingabe" }, 400);
  const cookie = visitorId(cookies, false);
  if (!cookie) return reply({ error: "Spiel nich jefunden." }, 404);

  try {
    const payload = await getPayloadClient();
    const game = await findGame(payload, input.data.token, bonVisitor(cookie));
    if (game?.status !== "playing") return reply({ error: "Spiel nich jefunden." }, 404);
    if (game.batches.length >= MAX_BATCHES)
      return reply({ error: "Jenug Karten für een Spiel." }, 400);

    const cards = dealBatch(await loadPool(), new Set(game.cards.map((c) => c.id)));
    // shortcut: two parallel nexts can overwrite each other's batch; the lost cards then fail finish's order check.
    await payload.update({
      collection: "bon-games",
      data: {
        batches: [...game.batches, { issuedAt: Date.now(), start: game.cards.length }],
        cards: [...game.cards, ...cards],
      },
      depth: 0,
      id: game.id,
    });
    return reply({ cards: cards.map((c, i) => toPublic(c, game.cards.length + i)) }, 200);
  } catch (error) {
    console.error("[bon] next failed:", error);
    return reply({ error: "Die Karten wollten leider nich kommen." }, 502);
  }
};
