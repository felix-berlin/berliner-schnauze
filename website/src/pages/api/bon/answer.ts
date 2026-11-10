import type { APIRoute } from "astro";

import { busyGames, findGame, wrongAnswers } from "@services/bonGame.ts";
import { getPayloadClient } from "@services/payload.ts";
import { reply } from "@utils/apiReply.ts";
import { answerSchema } from "@utils/bonSchema.ts";
import { LIVES } from "payload-app/bon-rules";

const NOT_FOUND = { error: "Spiel nich jefunden." };
const WRONG_CARD = { error: "Die Karte jibt's jetzt nich." };

/** Reveals the answer to the next unanswered card only. Timing is checked in `finish`, so a fast honest player never breaks mid-game. */
export const POST: APIRoute = async ({ request }) => {
  const input = answerSchema.safeParse(await request.json().catch(() => undefined));
  if (!input.success) return reply({ error: "Ungültige Eingabe" }, 400);
  const { card, real, token } = input.data;

  if (busyGames.has(token)) return reply(WRONG_CARD, 409);
  busyGames.add(token);
  try {
    const payload = await getPayloadClient();
    const game = await findGame(payload, token);
    if (game?.status !== "playing") return reply(NOT_FOUND, 404);

    const { cards } = game;
    const position = cards.findIndex((c) => c.answer === undefined);
    const wrongBefore = wrongAnswers(cards);
    if (position < 0 || String(position) !== card || wrongBefore >= LIVES)
      return reply(WRONG_CARD, 409);

    const dealt = cards[position];
    const correct = real === dealt.isReal;
    await payload.update({
      collection: "bon-games",
      data: {
        cards: cards.map((c, i) =>
          i === position ? Object.assign(c, {
	answer: real,
	answeredAt: Date.now()
}) : c,
        ),
      },
      depth: 0,
      id: game.id,
    });
    const lives = LIVES - wrongBefore - (correct ? 0 : 1);
    return reply(
      {
        category: dealt.category,
        correct,
        gameOver: lives === 0,
        isReal: dealt.isReal,
        lives,
        slug: dealt.slug,
        translation: dealt.translation,
      },
      200,
    );
  } catch (error) {
    console.error("[bon] answer failed:", error);
    return reply({ error: "Die Antwort wollte leider nich ankommen." }, 502);
  } finally {
    busyGames.delete(token);
  }
};
