import { AREAS } from "./wordFeedback";

/**
 * Districts a Jeschichte can be tied to: the 12 Berlin districts plus "outside" (Brandenburg, elsewhere).
 * Changing this list changes the `comments.bezirk` enum in the database: it needs a migration.
 */
export const STORY_BEZIRKE: readonly string[] = [
  ...AREAS.filter((a) => a !== "brandenburg" && a !== "elsewhere"),
  "outside",
];

/** Loose by design; the exact union is `Comment["bezirk"]` in payload-types. */
export type StoryBezirk = (typeof STORY_BEZIRKE)[number];
