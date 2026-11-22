import type { APIRoute } from "astro";

import { getPayloadClient } from "@services/payload.ts";
import { authorTagOf, visitorId, voterKey } from "@services/payload/comments.ts";
import { wordIdBySlug } from "@services/payload/wordId.ts";
import { reply } from "@utils/apiReply.ts";
import { logRouteError } from "@utils/logError.ts";

/**
 * The visitor's own state on the Jeschichten of a word: `reactions` on the published ones, `{ [commentId]: 1 | -1 }`,
 * and `pending`, their own submissions still awaiting review. Same identity as the comment votes and the comment
 * POST (the visitor cookie, hashed with `voterKey` / `authorTagOf`); never cached (`reply`).
 */
export const GET: APIRoute = async ({ cookies, url }) => {
  const slug = url.searchParams.get("word");
  if (!slug) return reply({ error: "Ungültige Anfrage" }, 400);

  try {
    const wordId = await wordIdBySlug(slug);
    if (wordId === null) return reply({ error: "Wort nicht gefunden" }, 404);
    const visitor = visitorId(cookies, false);
    if (!visitor) return reply({ pending: [], reactions: {} }, 200);

    const payload = await getPayloadClient();
    const top = { parent: { exists: false }, word: { equals: wordId } } as const;
    const [{ docs: stories }, { docs: open }] = await Promise.all([
      payload.find({
        collection: "comments",
        depth: 0,
        limit: 0,
        pagination: false,
        select: {},
        where: { ...top, status: { equals: "published" } },
      }),
      // Only these three fields leave: never authorTag, edit key or name.
      payload.find({
        collection: "comments",
        depth: 0,
        pagination: false,
        select: { createdAt: true, text: true },
        sort: "-createdAt",
        where: {
          ...top,
          authorTag: { equals: authorTagOf(visitor, wordId) },
          status: { equals: "pending" },
        },
      }),
    ]);
    const pending = open.map(({ createdAt, id, text }) => ({ createdAt, id, text }));
    if (!stories.length) return reply({ pending, reactions: {} }, 200);
    const { docs: votes } = await payload.find({
      collection: "comment-votes",
      depth: 0,
      pagination: false,
      where: {
        comment: { in: stories.map((s) => s.id) },
        visitor: { equals: voterKey(visitor) },
      },
    });
    const reactions: Record<string, 1 | -1> = {};
    for (const v of votes)
      reactions[String(typeof v.comment === "object" ? v.comment.id : v.comment)] = v.value as
        | 1
        | -1;
    return reply({ pending, reactions }, 200);
  } catch (error) {
    logRouteError("stories", error);
    return reply({ error: "Deine Reaktionen konnten nicht geladen werden." }, 502);
  }
};
