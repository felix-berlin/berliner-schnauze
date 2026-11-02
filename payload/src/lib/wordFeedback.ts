// Shared feedback options and counts (`payload-app/word-feedback`): no payload/next/config runtime imports.
import type { BasePayload, Where } from "payload";

export const REACTIONS = ["like", "dislike"] as const;
export const USAGES = ["say", "know", "never"] as const;
export const AREAS = [
  "mitte",
  "friedrichshain-kreuzberg",
  "pankow",
  "charlottenburg-wilmersdorf",
  "spandau",
  "steglitz-zehlendorf",
  "tempelhof-schoeneberg",
  "neukoelln",
  "treptow-koepenick",
  "marzahn-hellersdorf",
  "lichtenberg",
  "reinickendorf",
  "brandenburg",
  "elsewhere",
] as const;
export const ORIGINS = ["grewUp", "movedOver10", "movedUnder10"] as const;
export const HALVES = ["east", "west", "both"] as const;
export const AGES = [
  "u20",
  "20-29",
  "30-39",
  "40-49",
  "50-59",
  "60-69",
  "70-79",
  "80plus",
] as const;
/** Smallest group whose share is shown. */
export const MIN_GROUP = 10;

export type Reaction = (typeof REACTIONS)[number];
export type Usage = (typeof USAGES)[number];
export type Area = (typeof AREAS)[number];
export type Origin = (typeof ORIGINS)[number];
export type Half = (typeof HALVES)[number];
export type Age = (typeof AGES)[number];

export type FeedbackTotals = {
  like: number;
  dislike: number;
  say: number;
  know: number;
  never: number;
};
export type FeedbackCompare = {
  east: number | null;
  west: number | null;
  moved: number | null;
  area: number | null;
};

type Counter = Pick<BasePayload, "count">;

const count = async (payload: Counter, where: Where) =>
  (await payload.count({ collection: "word-feedback", where })).totalDocs;

export async function feedbackTotals(payload: Counter, wordId: number): Promise<FeedbackTotals> {
  const keys = [...REACTIONS, ...USAGES] as const;
  const counts = await Promise.all(
    keys.map((k) =>
      count(payload, {
        word: { equals: wordId },
        [REACTIONS.includes(k as Reaction) ? "reaction" : "usage"]: { equals: k },
      }),
    ),
  );
  return Object.fromEntries(keys.map((k, i) => [k, counts[i]])) as FeedbackTotals;
}

/** Percent of `say` among rows with a usage; null below MIN_GROUP. */
async function share(payload: Counter, wordId: number, group: Where): Promise<number | null> {
  const base: Where = { and: [{ word: { equals: wordId } }, { usage: { exists: true } }, group] };
  const total = await count(payload, base);
  if (total < MIN_GROUP) return null;
  const say = await count(payload, { and: [base, { usage: { equals: "say" } }] });
  return Math.round((say / total) * 100);
}

export async function feedbackCompare(
  payload: Counter,
  wordId: number,
  area: Area | null,
): Promise<FeedbackCompare> {
  const [east, west, moved, areaShare] = await Promise.all([
    share(payload, wordId, { half: { equals: "east" } }),
    share(payload, wordId, { half: { equals: "west" } }),
    share(payload, wordId, { origin: { in: ["movedOver10", "movedUnder10"] } }),
    area ? share(payload, wordId, { area: { equals: area } }) : null,
  ]);
  return { east, west, moved, area: areaShare };
}
