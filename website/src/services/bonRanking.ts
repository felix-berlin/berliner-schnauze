import type { PublicEntry } from "@services/bonLeaderboardApi.ts";

import { bonIdentityOf } from "@services/bonGame.ts";
import { ttl } from "@services/cache.ts";
import { getPayloadClient } from "@services/payload.ts";
import { displayName } from "payload-app/bon-names";
import { periodStart, rankGames, type Period, type RankedEntry } from "payload-app/bon-ranking";

// shortcut: whole period in memory, move to SQL (DISTINCT ON) when bon_games grows past ~50k rows.
const load = (period: Period) => async (): Promise<RankedEntry[]> => {
  const payload = await getPayloadClient();
  const start = periodStart(period, new Date());
  const { docs } = await payload.find({
    collection: "bon-games",
    depth: 0,
    pagination: false,
    select: {
      bestStreak: true,
      correctAnswers: true,
      finishedAt: true,
      nameHidden: true,
      nameReports: true,
      player: true,
      playerName: true,
      score: true,
      totalAnswered: true,
      visitor: true,
    },
    where: {
      status: { equals: "finished" },
      ...(start && { finishedAt: { greater_than_equal: start.toISOString() } }),
    },
  });
  return rankGames(
    docs.flatMap((g) =>
      g.finishedAt
        ? [
            {
              bestStreak: g.bestStreak ?? 0,
              correctAnswers: g.correctAnswers ?? 0,
              finishedAt: g.finishedAt,
              id: g.id,
              identity: bonIdentityOf(g.player, g.visitor),
              // Before the tag is derived: a hidden name becomes Anonym and so gets one.
              name: displayName(g),
              score: g.score ?? 0,
              totalAnswered: g.totalAnswered ?? 0,
            },
          ]
        : [],
    ),
  );
};

const makeCaches = () =>
  Object.fromEntries(
    (["week", "month", "all"] as const).map((p) => [p, ttl(60_000, load(p))]),
  ) as Record<Period, () => Promise<RankedEntry[]>>;
let caches = makeCaches();

export const loadRanking = (period: Period) => caches[period]();

/** An entry as the browser sees it: no identity, `isMe` on the asker's own row. */
export const toPublicEntry =
  (identity: string | undefined) =>
  ({ identity: id, ...entry }: RankedEntry): PublicEntry => ({
    ...entry,
    ...(id === identity && { isMe: true as const }),
  });

/** The own row at `index` with up to two neighbours on each side. */
export const aroundOf = (ranking: RankedEntry[], index: number) =>
  ranking.slice(Math.max(0, index - 2), index + 3).map(toPublicEntry(ranking[index]!.identity));

/**
 * A finished game must show up in the very next ranking read, not 60 s later.
 * shortcut: each finish forces a full reload of all periods ("all" = every finished row); invalidate only
 * week/month or debounce when bon_games grows.
 */
export const invalidateRanking = () => {
  caches = makeCaches();
};
