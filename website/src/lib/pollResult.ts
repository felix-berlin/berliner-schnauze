import {
  AGES,
  MIN_GROUP,
  USAGES,
  type Age,
  type Area,
  type Half,
  type Usage,
} from "payload-app/word-feedback";

export { MIN_GROUP };

export type FeedbackRow = {
  usage?: Usage | null;
  half?: Half | null;
  area?: Area | null;
  age?: Age | null;
};

export type Group = { key: string; selbst: number; n: number };

export type PollResult = {
  total: number;
  shares: { selbst: number; kenn: number; nie: number };
  matrix: Usage[];
  byRegion: Group[];
  byAge: Group[];
  own?: Usage;
};

/** One dot is 5 %, so a row has 20 dots. */
export const dotsFor = (pct: number): number => Math.round(pct / 5);

/** Largest-remainder rounding of the three counts to 100 parts (ties go to say, know, never). */
function hundredParts(counts: number[], total: number): number[] {
  // Integer remainders: float noise could break ties wrongly.
  const parts = counts.map((c) => Math.floor((c * 100) / total));
  const order = counts
    .map((c, i) => ({ i, rest: (c * 100) % total }))
    .sort((a, b) => b.rest - a.rest || a.i - b.i);
  for (let left = 100 - parts.reduce((a, b) => a + b, 0), k = 0; left > 0; left--, k++) {
    parts[order[k]!.i]!++;
  }
  return parts;
}

function toGroup(key: string, group: FeedbackRow[]): Group | null {
  const voted = group.filter((r) => r.usage);
  if (voted.length < MIN_GROUP) return null;
  const say = voted.filter((r) => r.usage === "say").length;
  return { key, n: voted.length, selbst: Math.round((say * 100) / voted.length) };
}

const present = (groups: (Group | null)[]): Group[] => groups.filter((g): g is Group => !!g);

export function buildPollResult(rows: FeedbackRow[], ownUsage?: Usage): PollResult {
  const voted = rows.filter((r) => r.usage);
  const total = voted.length;
  const counts = USAGES.map((u) => voted.filter((r) => r.usage === u).length);
  const [selbst, kenn, nie] = total ? hundredParts(counts, total) : [0, 0, 0];
  const matrix = total
    ? USAGES.flatMap((u, i) => Array<Usage>([selbst, kenn, nie][i]!).fill(u))
    : [];

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
    shares: { kenn: kenn!, nie: nie!, selbst: selbst! },
    total,
  };
}
