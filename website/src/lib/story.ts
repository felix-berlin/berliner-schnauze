import type { Comment } from "payload-app";

/** Exactly the districts of `STORY_BEZIRKE` (payload-types derives the union from the same list). */
export type StoryBezirk = NonNullable<Comment["bezirk"]>;

/** A Jeschichte as the browser sees it; per-visitor data (own reaction) is never part of it. */
export type Story = {
  id: string;
  text: string;
  /** `authorName` only; empty means "aus der Community". Returned as stored, views escape. */
  name?: string;
  bezirk?: StoryBezirk;
  createdAt: string;
  /** Upvotes ("Jenau!") */
  jenau: number;
  /** Downvotes ("Kenn ick anders") */
  anders: number;
};
