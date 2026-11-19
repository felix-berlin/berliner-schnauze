// Shapes of the admin stats data. Client-safe: no payload/drizzle imports (the chart component imports them).
import type { Metric } from "./statsMetrics";

export type TopWord = {
  id: number;
  berlinerisch: string;
  slug: string | null;
  /** Views for the "viewed" list, the share in percent for the two vote lists. */
  value: number;
};

/** A word of a vote list: `value` is a percent of `votes` answers. */
export type VotedWord = TopWord & { votes: number };

export const REACTION_KEYS = ["like", "dislike", "say", "know", "never"] as const;
export type ReactionKey = (typeof REACTION_KEYS)[number];

export type StatsData = {
  /** Per metric: Berlin day → count (days without events are missing). */
  daily: Record<Metric, Record<string, number>>;
  /** Sum of `daily` per metric. Counts all words, also trashed and draft ones (only the top lists skip those). */
  totals: Record<Metric, number>;
  reactionSplit: Record<ReactionKey, number>;
  topViewed: TopWord[];
  topLiked: VotedWord[];
  topSay: VotedWord[];
};
