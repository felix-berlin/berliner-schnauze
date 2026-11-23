import type { getPayloadClient } from "@services/payload.ts";

/** The `word-feedback` rows of a word with only what `buildPollResult` reads: one find, aggregated in code. */
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
      select: { age: true, area: true, half: true, usage: true },
      where: { word: { equals: wordId } },
    })
  ).docs;
