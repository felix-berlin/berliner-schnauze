import type { AREAS } from "./wordFeedback";

type Borough = Exclude<(typeof AREAS)[number], "brandenburg" | "elsewhere">;

/**
 * Districts a Jeschichte can be tied to: the 12 Berlin districts plus "outside" (Brandenburg, elsewhere).
 * Changing this list changes the `comments.bezirk` enum in the database: it needs a migration.
 */
export const STORY_BEZIRKE = [
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
  "outside",
] as const satisfies readonly (Borough | "outside")[];

export type StoryBezirk = (typeof STORY_BEZIRKE)[number];
