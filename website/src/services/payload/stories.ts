import type { Story } from "@lib/story.ts";
import type { Comment } from "payload-app";

import { getPayloadClient } from "@services/payload.ts";

export const toStory = (c: Comment): Story => ({
  anders: c.downvotes ?? 0,
  ...(c.bezirk ? { bezirk: c.bezirk } : {}),
  createdAt: c.createdAt,
  id: String(c.id),
  jenau: c.upvotes ?? 0,
  ...(c.authorName?.trim() ? { name: c.authorName.trim() } : {}),
  text: c.text,
});

/** The published top-level Jeschichten of a word: newest `limit`, the featured one and the total. */
export const fetchStories = async (wordId: number, limit: number) => {
  // Comment collections are login-only: default overrideAccess, own status filter, depth 0 (website/CLAUDE.md).
  const payload = await getPayloadClient();
  const where = {
    parent: { exists: false },
    status: { equals: "published" },
    word: { equals: wordId },
  } as const;
  const [items, featured, { totalDocs }] = await Promise.all([
    payload.find({ collection: "comments", depth: 0, limit, sort: "-createdAt", where }),
    payload.find({
      collection: "comments",
      depth: 0,
      limit: 1,
      where: { ...where, featured: { equals: true } },
    }),
    payload.count({ collection: "comments", where }),
  ]);
  return {
    featured: featured.docs[0] ? toStory(featured.docs[0]) : null,
    items: items.docs.map(toStory),
    total: totalDocs,
  };
};
