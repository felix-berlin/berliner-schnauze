import { AREA_NAMES } from "payload-app/word-feedback";

/** Display names of the 12 Bezirke by `STORY_BEZIRKE` key: `AREA_NAMES` without the outside areas, in its order. */
export const BEZIRK_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(AREA_NAMES).filter(([key]) => key !== "brandenburg" && key !== "elsewhere"),
);
