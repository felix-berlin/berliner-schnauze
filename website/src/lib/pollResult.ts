import {
  AGES,
  MIN_GROUP,
  USAGES,
  type Age,
  type Area,
  type Half,
  type Usage,
} from "payload-app/word-feedback";

import { dotsFromShares, largestRemainder } from "./largestRemainder.ts";

export { MIN_GROUP };

export type FeedbackRow = {
  usage?: Usage | null;
  half?: Half | null;
  area?: Area | null;
  age?: Age | null;
};

export type Region = "ost" | "west" | "umland";

export type Group<K extends string = string> = { key: K; selbst: number; n: number };

export type PollResult = {
  total: number;
  shares: { selbst: number; kenn: number; nie: number };
  matrix: Usage[];
  byRegion: Group<Region>[];
  byAge: Group<Age>[];
  own?: Usage;
};

/** One dot is 5 %, so a row has 20 dots. */
export const dotsFor = (pct: number): number => Math.round(pct / 5);

function toGroup<K extends string>(key: K, group: FeedbackRow[]): Group<K> | null {
  const voted = group.filter((r) => r.usage);
  if (voted.length < MIN_GROUP) return null;
  const say = voted.filter((r) => r.usage === "say").length;
  return { key, n: voted.length, selbst: Math.round((say * 100) / voted.length) };
}

const present = <K extends string>(groups: (Group<K> | null)[]): Group<K>[] =>
  groups.filter((g): g is Group<K> => !!g);

export function buildPollResult(rows: FeedbackRow[], ownUsage?: Usage): PollResult {
  const voted = rows.filter((r) => r.usage);
  const total = voted.length;
  const counts = USAGES.map((u) => voted.filter((r) => r.usage === u).length);
  const shares = largestRemainder(counts);
  const [selbst, kenn, nie] = shares as [number, number, number];
  const matrix = dotsFromShares(USAGES, shares);

  return {
    byAge: present(
      AGES.map((a) =>
        toGroup(
          a,
          rows.filter((r) => r.age === a),
        ),
      ),
    ),
    byRegion: present([
      toGroup(
        "ost",
        rows.filter((r) => r.half === "east"),
      ),
      toGroup(
        "west",
        rows.filter((r) => r.half === "west"),
      ),
      toGroup(
        "umland",
        rows.filter((r) => r.area === "brandenburg"),
      ),
    ]),
    matrix,
    ...(ownUsage && { own: ownUsage }),
    shares: { kenn, nie, selbst },
    total,
  };
}
