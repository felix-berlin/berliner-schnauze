import type { Period, RankedEntry } from "payload-app/bon-ranking";

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

export async function fetchLeaderboard(
  period: Period,
  offset: number,
  limit: number,
): Promise<LeaderboardReply> {
  const query = new URLSearchParams({ limit: String(limit), offset: String(offset), period });
  const res = await fetch(`/api/bon/leaderboard?${query}`).catch(() => undefined);
  const data = (await res?.json().catch(() => undefined)) as LeaderboardReply | undefined;
  if (!res?.ok || !data) throw new Error(FALLBACK_ERROR);
  return data;
}

/** Answers 204 without a body, so it cannot go through `post` in bonPlayerApi. The status lets callers tell 404 (gone) from 429. */
export async function reportName(id: number): Promise<void> {
  const res = await fetch("/api/bon/report-name", {
    body: JSON.stringify({ id }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  }).catch(() => undefined);
  if (!res) throw new Error(REPORT_ERROR);
  if (res.ok) return;
  const data = (await res.json().catch(() => undefined)) as { error?: string } | undefined;
  throw Object.assign(new Error(data?.error ?? REPORT_ERROR), { status: res.status });
}
