import type { APIRoute } from "astro";

import { busyGames, findGame, wrongAnswers } from "@services/bonGame.ts";
import { loadPool } from "@services/bonPool.ts";
import { getPayloadClient } from "@services/payload.ts";
import { reply } from "@utils/apiReply.ts";
import { dealBatch, toPublic } from "@utils/bonDeck.ts";
import { nextSchema } from "@utils/bonSchema.ts";
import { LIVES } from "payload-app/bon-rules";

const MAX_BATCHES = 20; // BATCH_SIZE × MAX_BATCHES must stay ≤ 400 cards (one answer each)

export const POST: APIRoute = async ({ request }) => {
  const input = nextSchema.safeParse(await request.json().catch(() => undefined));
  if (!input.success) return reply({ error: "Ungültige Eingabe" }, 400);
  const { token } = input.data;

  if (busyGames.has(token)) return reply({ error: "Moment, ick bin noch dran." }, 409);
  busyGames.add(token);
  try {
    const payload = await getPayloadClient();
    const game = await findGame(payload, token);
    if (game?.status !== "playing") return reply({ error: "Spiel nich jefunden." }, 404);
    if (wrongAnswers(game.cards) >= LIVES) return reply({ error: "Dett Spiel is vorbei." }, 409);
    // A lost reply is asked for again: while none of the newest batch is answered, return it instead of dealing past it.
    const newest = game.batches.at(-1);
    const open = newest ? game.cards.slice(newest.start) : [];
    if (game.batches.length > 1 && open.length > 0 && open.every((c) => c.answer === undefined))
      return reply({ cards: open.map((c, i) => toPublic(c, newest!.start + i)) }, 200);
    if (game.batches.length >= MAX_BATCHES)
      return reply({ error: "Jenug Karten für een Spiel." }, 400);

    const cards = dealBatch(await loadPool(), new Set(game.cards.map((c) => c.id)));
    // shortcut: busyGames serializes next and answer in this process only; a second web container would need a DB-level conditional update.
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
  } finally {
    busyGames.delete(token);
  }
};
