import type { APIRoute } from "astro";

import { bonVisitor, findGame } from "@services/bonGame.ts";
import { getPayloadClient } from "@services/payload.ts";
import { visitorId } from "@services/payload/comments.ts";
import { reply } from "@utils/apiReply.ts";
import { finishSchema } from "@utils/bonSchema.ts";
import { plausibleTiming, verifyRun } from "payload-app/bon-rules";

const INVALID = { error: "Ungültiges Spiel" };
const DONE = { error: "Dett Spiel is schon jewertet." };

// Payload's update({ where }) finds, then updates per doc, so its status condition alone is no lock.
// shortcut: in memory, one process; a second web container would need a DB-level conditional update.
const finishing = new Set<string>();

export const POST: APIRoute = async ({ cookies, request }) => {
  // A client with blocked cookies plays, but never ranks.
  const cookie = visitorId(cookies, false);
  if (!cookie) return reply({ error: "Ohne Cookie jibt's keen Ranking." }, 400);
  const input = finishSchema.safeParse(await request.json().catch(() => undefined));
  if (!input.success) return reply({ error: "Ungültige Eingabe" }, 400);
  const { answers, playerName, token } = input.data;

  if (finishing.has(token)) return reply(DONE, 409);
  finishing.add(token);
  let stored = false;
  try {
    const payload = await getPayloadClient();
    const game = await findGame(payload, token, bonVisitor(cookie));
    if (!game) return reply({ error: "Spiel nich jefunden." }, 404);
    if (game.status !== "playing") return reply(DONE, 409);

    const { batches, cards } = game;
    const now = Date.now();
    // Each answer names the public id (position) of its card; that also rules out reordered, duplicated and undealt ones.
    if (answers.length > cards.length || answers.some((a, i) => a.card !== String(i)))
      return reply(INVALID, 400);
    const result = verifyRun(
      cards.map((c) => c.isReal),
      answers.map((a) => a.real),
    );
    if (!result || batches.length === 0 || !plausibleTiming(batches, answers.length, now))
      return reply(INVALID, 400);

    // Still conditional on "playing", so a finish after a completed one changes nothing.
    const { docs } = await payload.update({
      collection: "bon-games",
      data: { ...result, finishedAt: new Date(now).toISOString(), playerName, status: "finished" },
      depth: 0,
      where: { id: { equals: game.id }, status: { equals: "playing" } },
    });
    if (docs.length === 0) return reply(DONE, 409);
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
  } finally {
    finishing.delete(token);
  }
};
