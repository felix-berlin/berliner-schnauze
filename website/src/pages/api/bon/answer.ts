import type { AnswerReply } from "@services/bonGameApi.ts";
import type { DealtCard } from "@utils/bonDeck.ts";
import type { APIRoute } from "astro";

import { findGame, withGameLock, wrongAnswers } from "@services/bonGame.ts";
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

  return withGameLock(
    token,
    () => reply(WRONG_CARD, 409),
    async () => {
      try {
        const payload = await getPayloadClient();
        const game = await findGame(payload, token);
        if (game?.status !== "playing") return reply(NOT_FOUND, 404);

        const { cards } = game;
        const open = cards.findIndex((c) => c.answer === undefined);
        const position = open < 0 ? cards.length : open;
        const replied = (dealt: DealtCard, wrong: number) =>
          reply(
            {
              category: dealt.category,
              correct: dealt.answer === dealt.isReal,
              gameOver: LIVES - wrong === 0,
              isReal: dealt.isReal,
              lives: LIVES - wrong,
              slug: dealt.slug,
              translation: dealt.translation,
            } satisfies AnswerReply,
            200,
          );
        // A lost reply is asked for again: the same guess for the last answered card gets the same reply, nothing stored.
        const last = cards[position - 1];
        const wrongBefore = wrongAnswers(cards);
        if (last && String(position - 1) === card && last.answer === real)
          return replied(last, wrongBefore);

        if (open < 0 || String(position) !== card || wrongBefore >= LIVES)
          return reply(WRONG_CARD, 409);

        const answered = { ...cards[position], answer: real, answeredAt: Date.now() };
        const stored = cards.with(position, answered);
        await payload.update({
          collection: "bon-games",
          data: { cards: stored },
          depth: 0,
          id: game.id,
        });
        return replied(answered, wrongAnswers(stored));
      } catch (error) {
        console.error("[bon] answer failed:", error);
        return reply({ error: "Die Antwort wollte leider nich ankommen." }, 502);
      }
    },
  );
};
