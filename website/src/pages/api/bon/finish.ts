import type { APIRoute } from "astro";

import { bonVisitor, findGame } from "@services/bonGame.ts";
import { getPayloadClient } from "@services/payload.ts";
import { visitorId } from "@services/payload/comments.ts";
import { reply } from "@utils/apiReply.ts";
import { finishSchema } from "@utils/bonSchema.ts";
import { plausibleTiming, verifyRun } from "payload-app/bon-rules";

const INVALID = { error: "Ungültiges Spiel" };

export const POST: APIRoute = async ({ cookies, request }) => {
  // A client with blocked cookies plays, but never ranks.
  const cookie = visitorId(cookies, false);
  if (!cookie) return reply({ error: "Ohne Cookie jibt's keen Ranking." }, 400);
  const input = finishSchema.safeParse(await request.json().catch(() => undefined));
  if (!input.success) return reply({ error: "Ungültige Eingabe" }, 400);
  const { answers, playerName, token } = input.data;

  let stored = false;
  try {
    const payload = await getPayloadClient();
    const game = await findGame(payload, token, bonVisitor(cookie));
    if (!game) return reply({ error: "Spiel nich jefunden." }, 404);
    if (game.status !== "playing") return reply({ error: "Dett Spiel is schon jewertet." }, 409);

    const { batches, cards } = game;
    const now = Date.now();
    // Each answer must name the card dealt at its position; that also rules out duplicates and undealt cards.
    if (answers.length > cards.length || answers.some((a, i) => a.card !== cards[i].id))
      return reply(INVALID, 400);
    const result = verifyRun(
      cards.map((c) => c.isReal),
      answers.map((a) => a.real),
    );
    if (!result || batches.length === 0 || !plausibleTiming(batches, answers.length, now))
      return reply(INVALID, 400);

    // Conditional on "playing": of two racing finishes only one updates the row.
    const { docs } = await payload.update({
      collection: "bon-games",
      data: { ...result, finishedAt: new Date(now).toISOString(), playerName, status: "finished" },
      depth: 0,
      where: { id: { equals: game.id }, status: { equals: "playing" } },
    });
    if (docs.length === 0) return reply({ error: "Dett Spiel is schon jewertet." }, 409);
    stored = true;

    const finished = { status: { equals: "finished" } } as const;
    const [higher, total] = await Promise.all([
      payload.count({
        collection: "bon-games",
        where: { ...finished, score: { greater_than: result.score } },
      }),
      payload.count({ collection: "bon-games", where: finished }),
    ]);
    return reply({ ...result, rank: higher.totalDocs + 1, totalGames: total.totalDocs }, 200);
  } catch (error) {
    console.error("[bon] finish failed:", error);
    return stored
      ? reply({ error: "Is jespeichert, aber der Platz wollte nich laden." }, 502)
      : reply({ error: "Dett Ergebnis konnte nich jespeichert werden." }, 502);
  }
};
