import type { APIRoute } from "astro";

import { getPayloadClient } from "@services/payload.ts";
import { visitorId, voterKey } from "@services/payload/comments.ts";
import { wordIdBySlug } from "@services/payload/wordId.ts";
import { reply } from "@utils/apiReply.ts";
import { logRouteError } from "@utils/logError.ts";

/**
 * The visitor's own reactions on the published Jeschichten of a word, `{ reactions: { [commentId]: 1 | -1 } }`.
 * Same identity as the comment votes (the visitor cookie, hashed with `voterKey`); never cached (`reply`).
 */
export const GET: APIRoute = async ({ cookies, url }) => {
  const slug = url.searchParams.get("word");
  if (!slug) return reply({ error: "Ungültige Anfrage" }, 400);

  try {
    const wordId = await wordIdBySlug(slug);
    if (wordId === null) return reply({ error: "Wort nicht gefunden" }, 404);
    const visitor = visitorId(cookies, false);
    if (!visitor) return reply({ reactions: {} }, 200);

    const payload = await getPayloadClient();
    const { docs: stories } = await payload.find({
      collection: "comments",
      depth: 0,
      limit: 0,
      pagination: false,
      select: {},
      where: {
        parent: { exists: false },
        status: { equals: "published" },
        word: { equals: wordId },
      },
    });
    if (!stories.length) return reply({ reactions: {} }, 200);
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
    return reply({ reactions }, 200);
  } catch (error) {
    logRouteError("stories", error);
    return reply({ error: "Deine Reaktionen konnten nicht geladen werden." }, 502);
  }
};
