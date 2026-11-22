import type { Story } from "@lib/story.ts";
import type { Comment } from "payload-app";

import { ttlBy } from "@services/cache.ts";
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

const load = async (key: string) => {
  const [wordId, limit] = key.split(":").map(Number) as [number, number];
  // Comment collections are login-only: default overrideAccess, own status filter, depth 0 (website/CLAUDE.md).
  const payload = await getPayloadClient();
  const where = {
    parent: { exists: false },
    status: { equals: "published" },
    word: { equals: wordId },
  } as const;
  const [items, { totalDocs }] = await Promise.all([
    payload.find({ collection: "comments", depth: 0, limit, sort: "-createdAt", where }),
    payload.count({ collection: "comments", where }),
  ]);
  const featured = totalDocs
    ? (
        await payload.find({
          collection: "comments",
          depth: 0,
          limit: 1,
          where: { ...where, featured: { equals: true } },
        })
      ).docs[0]
    : undefined;
  return {
    featured: featured ? toStory(featured) : null,
    items: items.docs.map(toStory),
    total: totalDocs,
  };
};

const MAX_WORDS = 500;
const memo = ttlBy(60_000, MAX_WORDS, load);

/**
 * The published top-level Jeschichten of a word: newest `limit`, the featured one and the total. The same for every
 * visitor (own reactions come from GET /api/stories/mine), so it is cached for a minute per word.
 */
export const fetchStories = (wordId: number, limit: number) => memo(`${wordId}:${limit}`);
