import { AREAS } from "./wordFeedback";

/** Districts a Jeschichte can be tied to: the 12 Berlin districts plus "outside" (Brandenburg, elsewhere). */
export const STORY_BEZIRKE: readonly string[] = [
  ...AREAS.filter((a) => a !== "brandenburg" && a !== "elsewhere"),
  "outside",
];

export type StoryBezirk = (typeof STORY_BEZIRKE)[number];
