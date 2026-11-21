import type { Payload } from "payload";

import { AGES, AREAS } from "../lib/wordFeedback";

/**
 * Invented votes for the start page aggregates (home-stats): five words x 12 districts x 10 votes (MIN_GROUP) spread
 * over all age brackets, plus 12 finished BON games that all dealt the real card "Bolle" (8 wrong answers).
 * Visitor hashes and tokens are fake. Skipped when its own votes (`e2e-…` hashes) exist already (the seed may run twice on one database).
 */
export async function seedHomeStats(payload: Payload): Promise<void> {
  if (
    (await payload.count({ collection: "word-feedback", where: { visitor: { like: "e2e-" } } }))
      .totalDocs > 0
  )
    return;
  const usages = ["say", "know", "never"] as const;
  for (const [k, slug] of ["bolle", "icke", "dette", "kiez", "bulette"].entries()) {
    const word = (
      await payload.find({ collection: "words", limit: 1, where: { slug: { equals: slug } } })
    ).docs[0];
    if (!word) continue;
    for (let j = 0; j < AREAS.slice(0, 12).length * 10; j++) {
      await payload.create({
        collection: "word-feedback",
        data: {
          age: AGES[j % AGES.length],
          area: AREAS.slice(0, 12)[Math.floor(j / 10)],
          usage: usages[(j + k + (j % AGES.length < 2 ? 0 : 1)) % 3],
          visitor: `e2e-${slug}-${j}`,
          word: word.id,
        },
      });
    }
  }
  const now = new Date().toISOString();
  for (let i = 0; i < 12; i++) {
    await payload.create({
      collection: "bon-games",
      data: {
        batches: [],
        cards: [{ answer: i >= 8, id: "0", isReal: true, slug: "bolle", word: "Bolle" }],
        finishedAt: now,
        status: "finished",
        token: `e2e-token-${i}`,
        visitor: `e2e-visitor-${i}`,
      },
    });
  }
}
