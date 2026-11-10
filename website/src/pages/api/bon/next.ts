import type { APIRoute } from "astro";

import { findGame } from "@services/bonGame.ts";
import { loadPool } from "@services/bonPool.ts";
import { getPayloadClient } from "@services/payload.ts";
import { reply } from "@utils/apiReply.ts";
import { dealBatch, toPublic } from "@utils/bonDeck.ts";
import { nextSchema } from "@utils/bonSchema.ts";

const MAX_BATCHES = 20; // BATCH_SIZE × MAX_BATCHES must stay ≤ 400 cards (one answer each)

export const POST: APIRoute = async ({ request }) => {
  const input = nextSchema.safeParse(await request.json().catch(() => undefined));
  if (!input.success) return reply({ error: "Ungültige Eingabe" }, 400);

  try {
    const payload = await getPayloadClient();
    const game = await findGame(payload, input.data.token);
    if (game?.status !== "playing") return reply({ error: "Spiel nich jefunden." }, 404);
    if (game.batches.length >= MAX_BATCHES)
      return reply({ error: "Jenug Karten für een Spiel." }, 400);

    const cards = dealBatch(await loadPool(), new Set(game.cards.map((c) => c.id)));
    // shortcut: two parallel nexts hand out the same positions with different words and only one batch is stored, so answers to the lost batch are scored against other words. Answers are still scored against the stored cards; the client must keep at most one next in flight.
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
