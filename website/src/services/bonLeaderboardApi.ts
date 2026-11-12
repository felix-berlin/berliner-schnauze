import type { Period, RankedEntry } from "payload-app/bon-ranking";

import { send } from "@services/bonPlayerApi.ts";

// Type-only: the module imports node:crypto, which the client must not bundle.
export type { Period };

/** What GET /api/bon/leaderboard sends: the ranking entry without the internal identity. */
export type PublicEntry = Omit<RankedEntry, "identity"> & { isMe?: true };

export interface LeaderboardReply {
  entries: PublicEntry[];
  total: number;
  me?: { rank: number; score: number; accuracy: number; bestStreak: number; around: PublicEntry[] };
}

const REPORT_ERROR = "Die Meldung konnte leider nich jesendet werden.";
const FALLBACK_ERROR = "Die Rangliste is jerade nich zu kriegen.";

export const fetchLeaderboard = (
  period: Period,
  offset: number,
  limit: number,
): Promise<LeaderboardReply> =>
  send(
    "GET",
    `/api/bon/leaderboard?${new URLSearchParams({ limit: String(limit), offset: String(offset), period })}`,
    undefined,
    FALLBACK_ERROR,
  );

/** The error's status lets callers tell 404 (gone) from 429. */
export const reportName = (id: number): Promise<void> =>
  send("POST", "/api/bon/report-name", { id }, REPORT_ERROR);
