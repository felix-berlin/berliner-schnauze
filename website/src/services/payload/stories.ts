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

export const STORIES_PAGE_SIZE = 20;

const load = async (key: string) => {
  const [wordId, page] = key.split(":").map(Number) as [number, number];
  // Comment collections are login-only: default overrideAccess, own status filter, depth 0 (website/CLAUDE.md).
  const payload = await getPayloadClient();
  const where = {
    parent: { exists: false },
    status: { equals: "published" },
    word: { equals: wordId },
  } as const;
  const findFeatured = async () =>
    (
      await payload.find({
        collection: "comments",
        depth: 0,
        limit: 1,
        where: { ...where, featured: { equals: true } },
      })
    ).docs[0];
  const newestFirst = { collection: "comments", depth: 0, sort: "-createdAt" } as const;

  // The featured story is shown apart from the list on every page, so it never repeats in `items`.
  if (page === 1) {
    // Both reads at once: one row more than a page, so the list still has a full page once the featured one is dropped.
    const [featured, list] = await Promise.all([
      findFeatured(),
      payload.find({ ...newestFirst, limit: STORIES_PAGE_SIZE + 1, where }),
    ]);
    const rows = list.docs.filter((c) => c.id !== featured?.id);
    return {
      featured: featured ? toStory(featured) : null,
      hasMore: list.totalDocs - (featured ? 1 : 0) > STORIES_PAGE_SIZE,
      items: rows.slice(0, STORIES_PAGE_SIZE).map(toStory),
      page,
      total: list.totalDocs,
    };
  }
  // Later pages page through the list without the featured row, so the rows keep their place across pages.
  const featured = await findFeatured();
  const list = await payload.find({
    ...newestFirst,
    limit: STORIES_PAGE_SIZE,
    page,
    where: featured ? { ...where, id: { not_equals: featured.id } } : where,
  });
  return {
    featured: null,
    hasMore: list.hasNextPage,
    items: list.docs.map(toStory),
    page,
    total: list.totalDocs + (featured ? 1 : 0),
  };
};

const MAX_KEYS = 500;
const memo = ttlBy(60_000, MAX_KEYS, load);

/**
 * One page (`STORIES_PAGE_SIZE`, 1-based) of the published top-level Jeschichten of a word, newest first and without
 * the featured one, which comes apart on page 1 only. `total` counts the featured one. The same for every visitor
 * (own reactions come from GET /api/stories/mine), so it is cached for a minute per word and page.
 */
export const fetchStories = async (wordId: number, page: number) => {
  const first = await memo(`${wordId}:1`);
  if (page === 1) return first;
  // Far-out pages would each fill a cache slot (MAX_KEYS) and push real words out: answer them empty, uncached.
  const lastPage = Math.max(
    1,
    Math.ceil((first.total - (first.featured ? 1 : 0)) / STORIES_PAGE_SIZE),
  );
  return page > lastPage
    ? { featured: null, hasMore: false, items: [], page, total: first.total }
    : memo(`${wordId}:${page}`);
};
