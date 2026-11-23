import { ttlBy } from "@services/cache.ts";
import { getPayloadClient } from "@services/payload.ts";

/** The `word-feedback` rows of a word with only what the poll and the counts read: one find, aggregated in code. */
export const fetchPollRows = async (
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  wordId: number,
) =>
  (
    await payload.find({
      collection: "word-feedback",
      depth: 0,
      limit: 0,
      pagination: false,
      select: {
        age: true,
        area: true,
        half: true,
        locality: true,
        origin: true,
        reaction: true,
        usage: true,
      },
      where: { word: { equals: wordId } },
    })
  ).docs;

/**
 * `fetchPollRows` memoized per word for 60 s: the shared, non-personal part of the word page and of
 * `GET /api/word-feedback`. The rows hold no visitor hash and are only ever reduced to counts (the own vote is
 * never part of them), so one visitor's answers cannot reach another except as a count. Counts may lag up to 60 s
 * (per process); `PATCH` and `DELETE` call `.forget(word)` so the voter's own next read is current.
 */
export const sharedPollRows = ttlBy(60_000, 500, async (wordId: number) =>
  fetchPollRows(await getPayloadClient(), wordId),
);
