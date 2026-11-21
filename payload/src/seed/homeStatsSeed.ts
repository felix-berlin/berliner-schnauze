import type { Payload } from "payload";

import { AGES, AREAS } from "../lib/wordFeedback";

/**
 * Invented votes for the start page aggregates (home-stats): ten words (five fixed, the five most viewed) x 12 districts x 10 votes (MIN_GROUP) spread
 * over all age brackets, plus 12 finished BON games that all dealt the real card "Bolle" (8 wrong answers).
 * Visitor hashes and tokens are fake. A word that already has its own votes (`e2e-…` hashes) is skipped (the seed may run twice on one database).
 */
export async function seedHomeStats(payload: Payload): Promise<void> {
  const usages = ["say", "know", "never"] as const;
  // The five fixed words plus the five most viewed ones: "Gerade beliebt" shows a share only for words with enough votes.
  const stats = await payload.find({
    collection: "word-stats",
    depth: 0,
    limit: 500,
    pagination: false,
    sort: "-views",
  });
  const views = new Map<number | string, number>();
  for (const r of stats.docs) {
    const id = typeof r.word === "object" ? r.word.id : r.word;
    views.set(id, (views.get(id) ?? 0) + r.views);
  }
  const top = [...views].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const words = [
    ...(
      await payload.find({
        collection: "words",
        depth: 0,
        limit: 5,
        where: { slug: { in: ["bolle", "icke", "dette", "kiez", "bulette"] } },
      })
    ).docs,
    ...(
      await payload.find({
        collection: "words",
        depth: 0,
        limit: 5,
        where: { id: { in: top.map(([id]) => id) } },
      })
    ).docs,
  ];
  for (const [k, word] of [...new Map(words.map((w) => [w.id, w])).values()].entries()) {
    const slug = word.slug ?? String(word.id);
    // Per word, so a second run adds only what is missing.
    const own = { visitor: { like: `e2e-${slug}-` }, word: { equals: word.id } };
    if ((await payload.count({ collection: "word-feedback", where: own })).totalDocs > 0) continue;
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
  if (
    (await payload.count({ collection: "bon-games", where: { token: { like: "e2e-token-" } } }))
      .totalDocs > 0
  )
    return;
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
