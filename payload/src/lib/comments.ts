// Pure comment rules, shared by Payload hooks and the site (`payload-app/comments`): no payload/next/config imports.
export const COMMENT_MAX = 1000;
export const NAME_MAX = 50;
export const EDIT_WINDOW_MS = 5 * 60_000;

export type CommentStatus = "published" | "pending" | "hidden" | "removed" | "deleted";

// scheme, `www.`, or `label.tld` (label >= 2 chars, letters-only TLD of 2-24): not `z.B.` or `1.5`
// ponytail: `ende.Dann` (no space after the period) also matches; fine for a spam filter.
const LINK = /https?:\/\/|www\./i;
const DOMAIN = /[a-z0-9][a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,24}(?=$|[\s/.,;:!?)"'])/i;

export const containsLink = (text: string): boolean => LINK.test(text) || DOMAIN.test(text);

export const hideThreshold = (score: number): number => Math.max(2, 3 + Math.floor(score / 10));

export const shouldAutoHide = (c: {
  status: CommentStatus;
  reviewed?: boolean | null;
  score: number;
  reportCount: number;
}): boolean => c.status === "published" && !c.reviewed && c.reportCount >= hideThreshold(c.score);
