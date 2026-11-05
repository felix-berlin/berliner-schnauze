export type DealtCard = { id: string; word: string; isReal: boolean; translation?: string };

export const BATCH_SIZE = 20;
const MIN_REAL = 10;
const MAX_REAL = 15;

/** Fisher–Yates on a copy. */
const shuffle = <T>(items: T[], random: () => number): T[] => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** One batch: 10-15 real cards, the rest fake, shuffled, none already in `used`. */
export function dealBatch(
  pool: { real: DealtCard[]; fake: DealtCard[] },
  used: Set<string>,
  random: () => number = Math.random,
): DealtCard[] {
  const realCount = MIN_REAL + Math.floor(random() * (MAX_REAL - MIN_REAL + 1));
  const fresh = (cards: DealtCard[]) => cards.filter((c) => !used.has(c.id));
  const real = fresh(pool.real);
  const fake = fresh(pool.fake);
  if (real.length < realCount || fake.length < BATCH_SIZE - realCount) {
    throw new Error(
      `pool too small: ${real.length} real (need ${realCount}), ${fake.length} fake (need ${BATCH_SIZE - realCount}), ${used.size} used`,
    );
  }
  return shuffle(
    [
      ...shuffle(real, random).slice(0, realCount),
      ...shuffle(fake, random).slice(0, BATCH_SIZE - realCount),
    ],
    random,
  );
}

/** The public card: its position in the game's dealt order as id, so the id tells nothing about the solution. */
export const toPublic = (c: DealtCard, index: number) => ({ id: String(index), word: c.word });
