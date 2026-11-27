import type { SearchState } from "./state";
import type { Share, Usage } from "./types";

export const MIN_VOTES = 10;
export const OFT_MIN = 0.5;
export const KAUM_MAX = 0.2;
export const EAST_WEST_DIFF = 0.1;

const enough = (share: Share | undefined) =>
  share && share.votes >= MIN_VOTES ? share : undefined;

/** Share of the chosen area / age group (both: area, only if the age group counts too); total otherwise. undefined below MIN_VOTES. */
export const usageFor = (
  u: Usage | undefined,
  s: Pick<SearchState, "area" | "age">,
): Share | undefined => {
  if (!u) return undefined;
  const area = s.area ? enough(u.areas?.[s.area]) : undefined;
  const age = s.age ? enough(u.ages?.[s.age]) : undefined;
  // TODO(suche): confirm which share wins when Bezirk and Altersgruppe are both set
  if (s.area && s.age) return area && age ? area : undefined;
  if (s.area) return area;
  if (s.age) return age;
  return enough(u);
};

export const oftenBucket = (share: number): "oft" | "manchmal" | "kaum" =>
  share >= OFT_MIN ? "oft" : share < KAUM_MAX ? "kaum" : "manchmal";

// The epsilon absorbs float error: 0.6 - 0.5 is 0.0999...98.
export const eastWest = (u: Usage): "ost" | "west" | "beides" | undefined => {
  if (u.east === undefined || u.west === undefined) return undefined;
  const diff = u.east - u.west;
  if (Math.abs(diff) < EAST_WEST_DIFF - 1e-9) return "beides";
  return diff > 0 ? "ost" : "west";
};
