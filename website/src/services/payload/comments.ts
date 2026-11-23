import type { AstroCookies } from "astro";

import { createHash } from "node:crypto";

// The comment collections are login-only (`authenticatedOnly`), so `siteRead()` would lock the site out: comment
// queries here and in the comment API routes keep Payload's default overrideAccess and filter `status` themselves.
// Keep them at `depth: 0`, so no draft word gets populated through a relation.
export const VISITOR_COOKIE = "bs_visitor";

/** The visitor's anonymous id (posts, votes, reports). Created only when `create`; never readable by scripts. */
export const visitorId = (cookies: AstroCookies, create: boolean): string | undefined => {
  const existing = cookies.get(VISITOR_COOKIE)?.value;
  if (existing || !create) return existing;
  const id = crypto.randomUUID();
  cookies.set(VISITOR_COOKIE, id, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/api/",
    sameSite: "lax",
    secure: import.meta.env.PROD,
  });
  return id;
};

/**
 * What the vote and report rows store instead of the cookie id. Its own prefix keeps those rows from being joined to
 * a comment's `authorTag` or a feedback row, which hash the same cookie differently. No secret: this pseudonymises
 * (whoever holds the DB and a cookie value can recompute it), it does not anonymise.
 */
export const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");

export const voterKey = (visitor: string): string => sha256(`votes:${visitor}`);

export const hashEditKey = sha256;

/** Per-word handle on a comment (`authorTag`): one visitor, one tag per word, not linkable across words. */
export const authorTagOf = (visitor: string, wordId: number): string =>
  sha256(`${visitor}:${wordId}`).slice(0, 16);
