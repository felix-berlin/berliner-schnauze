// Pure BON ranking, shared by the leaderboard route (payload-app/bon-ranking): periods, best game per pseudonym, tag.
import { createHash } from "node:crypto";

import { addDays, berlinDay, dayStart } from "./berlinTime";
import { ANONYM } from "./bonNames";
import { CODE_ALPHABET } from "./bonPlayer";

export type Period = "week" | "month" | "all";

/** Week = Monday 00:00 Berlin, month = the 1st 00:00 Berlin, all = undefined. */
export function periodStart(period: Period, now: Date): Date | undefined {
  if (period === "all") return undefined;
  const today = berlinDay(now);
  if (period === "month") return dayStart(`${today.slice(0, 8)}01`);
  const sinceMonday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  return dayStart(addDays(today, -sinceMonday));
}

/** shortcut: byte % 31 favors the first 8 characters of the alphabet slightly; irrelevant for a display tag. */
export const bonTag = (identity: string): string =>
  [...createHash("sha256").update(`bon-tag:${identity}`).digest().subarray(0, 4)]
    .map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
    .join("");

export type RankInput = {
  id: number;
  identity: string;
  name: string;
  score: number;
  correctAnswers: number;
  totalAnswered: number;
  bestStreak: number;
  finishedAt: string;
};

export type RankedEntry = {
  rank: number;
  id: number;
  identity: string;
  name: string;
  tag?: string;
  score: number;
  accuracy: number;
  bestStreak: number;
  finishedAt: string;
};

// A full tie falls back to the id, so the order never depends on the input order.
const better = (a: RankInput, b: RankInput) =>
  a.score !== b.score
    ? a.score > b.score
    : a.finishedAt !== b.finishedAt
      ? a.finishedAt < b.finishedAt
      : a.id < b.id;

/** Best game per identity, sorted by score desc, then finishedAt asc, then id asc; ranks are consecutive, ties get no shared rank. */
export function rankGames(games: RankInput[]): RankedEntry[] {
  const best = new Map<string, RankInput>();
  for (const g of games) {
    const cur = best.get(g.identity);
    if (!cur || better(g, cur)) best.set(g.identity, g);
  }
  return [...best.values()]
    .sort((a, b) => (a.id === b.id ? 0 : better(a, b) ? -1 : 1))
    .map((g, i) => {
      const entry: RankedEntry = {
        accuracy: g.totalAnswered ? Math.round((g.correctAnswers / g.totalAnswered) * 100) : 0,
        bestStreak: g.bestStreak,
        finishedAt: g.finishedAt,
        id: g.id,
        identity: g.identity,
        name: g.name,
        rank: i + 1,
        score: g.score,
      };
      if (g.name === ANONYM) entry.tag = bonTag(g.identity);
      return entry;
    });
}
