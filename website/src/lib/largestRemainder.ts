/** Whole shares of `counts` that sum to exactly `total` (largest remainder); all 0 without votes. Ties go to the earlier entry. */
export const largestRemainder = (counts: readonly number[], total = 100): number[] => {
  const sum = counts.reduce((a, b) => a + b, 0);
  if (!sum) return counts.map(() => 0);
  // Integer remainders: float noise could break ties wrongly.
  const parts = counts.map((c) => Math.floor((c * total) / sum));
  const order = counts
    .map((c, i) => ({ i, rest: (c * total) % sum }))
    .sort((a, b) => b.rest - a.rest || a.i - b.i);
  for (let left = total - parts.reduce((a, b) => a + b, 0), k = 0; left > 0; left--, k++) {
    parts[order[k]!.i]!++;
  }
  return parts;
};

/** One entry per whole share: `shares[i]` copies of `usages[i]`, in order (the "100 dots" row). */
export const dotsFromShares = <T>(usages: readonly T[], shares: readonly number[]): T[] =>
  usages.flatMap((u, i) => Array<T>(shares[i] ?? 0).fill(u));
