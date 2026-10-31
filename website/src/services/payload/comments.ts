import type { PublicComment } from "@utils/commentSchema.ts";
import type { AstroCookies } from "astro";
import type { Comment } from "payload-app";
import type { CommentStatus } from "payload-app/comments";

import { getPayloadClient } from "@services/payload.ts";
import { createHash } from "node:crypto";

export const PAGE_SIZE = 20;
export const VISITOR_COOKIE = "bs_visitor";
const ANONYMOUS = "Anonymer Berliner";
const LISTED: CommentStatus[] = ["published", "hidden", "removed", "deleted"];

/** The visitor's anonymous id (votes, reports). Created only when `create`; never readable by scripts. */
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

export const hashEditKey = (key: string): string => createHash("sha256").update(key).digest("hex");

const idOf = (rel: number | { id: number } | null | undefined): number | null =>
  rel == null ? null : typeof rel === "object" ? rel.id : rel;

/** Maps a stored comment to what the browser may see; never carries editKeyHash. */
export const toPublic = (c: Comment, myVote: -1 | 0 | 1 = 0): PublicComment => {
  const state =
    c.status === "published" ? "visible" : c.status === "hidden" ? "reviewing" : "removed";
  return {
    authorName: state === "visible" ? c.authorName?.trim() || ANONYMOUS : ANONYMOUS,
    createdAt: c.createdAt,
    downvotes: c.downvotes ?? 0,
    edited: Boolean(c.editedAt),
    id: c.id,
    myVote,
    parentId: idOf(c.parent),
    removalReason: state === "removed" ? (c.removalReason ?? null) : null,
    replies: [],
    state,
    text: state === "visible" ? c.text : null,
    upvotes: c.upvotes ?? 0,
  };
};

export const listComments = async (
  wordId: number,
  sort: "best" | "new",
  page: number,
  visitor?: string,
): Promise<{ comments: PublicComment[]; hasMore: boolean; total: number }> => {
  const payload = await getPayloadClient();
  const word = { equals: wordId };
  const listed = { in: LISTED };

  const [top, { totalDocs: total }] = await Promise.all([
    payload.find({
      collection: "comments",
      depth: 0,
      limit: PAGE_SIZE,
      page,
      sort: sort === "best" ? ["-score", "-createdAt"] : ["-createdAt"],
      where: { parent: { exists: false }, status: listed, word },
    }),
    payload.count({ collection: "comments", where: { status: { equals: "published" }, word } }),
  ]);

  const ids = top.docs.map((c) => c.id);
  const replies = ids.length
    ? (
        await payload.find({
          collection: "comments",
          depth: 0,
          pagination: false,
          sort: "createdAt",
          where: { parent: { in: ids }, status: { equals: "published" }, word },
        })
      ).docs
    : [];
  // A reply has no thread of its own: removed or hidden ones are never fetched.
  const allIds = [...ids, ...replies.map((r) => r.id)];
  const votes =
    visitor && allIds.length
      ? (
          await payload.find({
            collection: "comment-votes",
            depth: 0,
            pagination: false,
            where: { comment: { in: allIds }, visitor: { equals: visitor } },
          })
        ).docs
      : [];
  const mine = new Map(votes.map((v) => [idOf(v.comment), v.value as -1 | 1]));
  const vote = (id: number) => mine.get(id) ?? 0;

  const comments: PublicComment[] = [];
  for (const c of top.docs) {
    const own = replies.filter((r) => idOf(r.parent) === c.id);
    // A placeholder only stays to hold its visible replies.
    if (c.status !== "published" && !own.length) continue;
    comments.push({ ...toPublic(c, vote(c.id)), replies: own.map((r) => toPublic(r, vote(r.id))) });
  }
  return { comments, hasMore: top.hasNextPage, total };
};
