import type { APIRoute } from "astro";

import { bonVisitor, busyGames, findGame } from "@services/bonGame.ts";
import { invalidateRanking } from "@services/bonRanking.ts";
import { getPayloadClient } from "@services/payload.ts";
import { visitorId } from "@services/payload/comments.ts";
import { reply } from "@utils/apiReply.ts";
import { finishSchema } from "@utils/bonSchema.ts";
import { plausibleTiming, verifyRun } from "payload-app/bon-rules";

const INVALID = { error: "Ungültiges Spiel" };
const DONE = { error: "Dett Spiel is schon jewertet." };

// Payload's update({ where }) finds, then updates per doc, so its status condition alone is no lock; busyGames (shared with next/answer) is.

export const POST: APIRoute = async ({ cookies, request }) => {
  // A client with blocked cookies plays, but never ranks.
  const cookie = visitorId(cookies, false);
  if (!cookie) return reply({ error: "Ohne Cookie jibt's keen Ranking." }, 400);
  const input = finishSchema.safeParse(await request.json().catch(() => undefined));
  if (!input.success) return reply({ error: "Ungültige Eingabe" }, 400);
  const { playerName: sentName, token } = input.data;

  if (busyGames.has(token)) return reply(DONE, 409);
  busyGames.add(token);
  try {
    const payload = await getPayloadClient();
    const game = await findGame(payload, token, bonVisitor(cookie));
    if (!game) return reply({ error: "Spiel nich jefunden." }, 404);
    if (game.status !== "playing") return reply(DONE, 409);

    const playerId =
      game.player == null
        ? undefined
        : typeof game.player === "object"
          ? game.player.id
          : game.player;
    // A code player's name lives on the player, so a game on another device cannot bring back an old name.
    const storedName =
      playerId === undefined
        ? undefined
        : await payload
            .find({
              collection: "bon-players",
              depth: 0,
              limit: 1,
              select: { name: true },
              where: { id: { equals: playerId } },
            })
            .then((r) => r.docs[0]?.name || undefined)
            .catch((error: unknown) => {
              console.error("[bon] player name lookup failed:", error);
              return undefined;
            });
    const playerName = storedName ?? sentName;

    const { batches, cards } = game;
    const now = Date.now();
    const guesses = cards.map((c) => c.answer).filter((a): a is boolean => a !== undefined);
    const rejected = (reason: string) => {
      console.warn("[bon] finish rejected:", reason, { answers: guesses.length, id: game.id });
      return reply(INVALID, 400);
    };
    const result = verifyRun(
      cards.map((c) => c.isReal),
      guesses,
    );
    if (!result) return rejected("run does not end at the third wrong answer");
    if (batches.length === 0 || !plausibleTiming(batches, guesses.length, now))
      return rejected("implausible timing");

    // Still conditional on "playing", so a finish after a completed one changes nothing.
    const { docs, errors } = await payload.update({
      collection: "bon-games",
      data: { ...result, finishedAt: new Date(now).toISOString(), playerName, status: "finished" },
      depth: 0,
      where: { id: { equals: game.id }, status: { equals: "playing" } },
    });
    if (errors.length > 0) throw new Error(`update failed: ${errors[0].message}`);
    if (docs.length === 0) return reply(DONE, 409);
    invalidateRanking();

    // The name follows the player's latest game; a failure must not hide the stored result.
    // A game without a name must not replace a name the player already chose.
    if (playerId !== undefined && !storedName && playerName !== "Anonym")
      await payload
        .update({
          collection: "bon-players",
          data: { name: playerName },
          depth: 0,
          id: playerId,
        })
        .catch((error: unknown) => console.error("[bon] player name update failed:", error));

    const finished = { status: { equals: "finished" } } as const;
    // The result is stored; a failed rank lookup must not hide it.
    const ranking = await Promise.all([
      payload.count({
        collection: "bon-games",
        where: { ...finished, score: { greater_than: result.score } },
      }),
      payload.count({ collection: "bon-games", where: finished }),
    ]).catch((error: unknown) => {
      console.error("[bon] rank lookup failed:", error);
      return undefined;
    });
    return reply(
      {
        ...result,
        rank: ranking && ranking[0].totalDocs + 1,
        totalGames: ranking && ranking[1].totalDocs,
      },
      200,
    );
  } catch (error) {
    console.error("[bon] finish failed:", error);
    return reply({ error: "Dett Ergebnis konnte nich jespeichert werden." }, 502);
  } finally {
    busyGames.delete(token);
  }
};
