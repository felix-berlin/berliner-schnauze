import type { APIRoute } from "astro";
import type { RankedEntry } from "payload-app/bon-ranking";

import { bonVisitor } from "@services/bonGame.ts";
import { playerFromCookie } from "@services/bonPlayer.ts";
import { loadRanking } from "@services/bonRanking.ts";
import { getPayloadClient } from "@services/payload.ts";
import { visitorId } from "@services/payload/comments.ts";
import { reply } from "@utils/apiReply.ts";
import { z } from "zod";

const digits = (max: number) =>
  z
    .string()
    .regex(/^\d{1,6}$/)
    .transform(Number)
    .pipe(z.number().max(max));

const querySchema = z.object({
  limit: digits(25).default(25),
  offset: digits(1_000_000).default(0),
  period: z.enum(["week", "month", "all"]),
});

export const GET: APIRoute = async ({ cookies, url }) => {
  const query = querySchema.safeParse({
    limit: url.searchParams.get("limit") ?? undefined,
    offset: url.searchParams.get("offset") ?? undefined,
    period: url.searchParams.get("period"),
  });
  if (!query.success) return reply({ error: "Ungültige Eingabe" }, 400);
  const { limit, offset, period } = query.data;
  try {
    const payload = await getPayloadClient();
    const ranking = await loadRanking(period);
    // No cookie is set here: a visitor without one simply has no "me".
    const player = await playerFromCookie(payload, cookies);
    const cookie = visitorId(cookies, false);
    const identity = player ? `p:${player.id}` : cookie && `v:${bonVisitor(cookie)}`;
    const myIndex = identity ? ranking.findIndex((e) => e.identity === identity) : -1;

    const pub = ({ identity: id, ...entry }: RankedEntry) => ({
      ...entry,
      ...(id === identity && { isMe: true as const }),
    });
    const mine = ranking[myIndex];
    return reply(
      {
        entries: ranking.slice(offset, offset + limit).map(pub),
        ...(mine && {
          me: {
            accuracy: mine.accuracy,
            around: ranking.slice(Math.max(0, myIndex - 2), myIndex + 3).map(pub),
            bestStreak: mine.bestStreak,
            rank: mine.rank,
            score: mine.score,
          },
        }),
        total: ranking.length,
      },
      200,
    );
  } catch (error) {
    console.error("[bon] leaderboard failed:", error);
    return reply({ error: "Die Rangliste wollte leider nich kommen." }, 502);
  }
};
