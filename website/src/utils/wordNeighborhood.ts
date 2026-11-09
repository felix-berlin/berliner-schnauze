/** Related words minus those the analysis band already lists (matched by slug). */
export function dedupeRelated<T extends { slug: string }>(related: T[], exclude: string[]): T[] {
  const skip = new Set(exclude);
  return related.filter((w) => !skip.has(w.slug));
}

export interface NeighborhoodInput<
  R extends { berlinerisch: string; slug: string },
  N extends { berlinerisch: string },
> {
  word: string;
  related: R[];
  before: N[];
  after: N[];
  exclude: string[];
}

/** What the Umfeld card shows: related words without the current word and the analysis duplicates, neighbours with a headword. */
export function neighborhoodWords<R extends { berlinerisch: string; slug: string }, N extends { berlinerisch: string }>({
  word,
  related,
  before,
  after,
  exclude,
}: NeighborhoodInput<R, N>) {
  return {
    after: after.filter((w) => w.berlinerisch),
    before: before.filter((w) => w.berlinerisch),
    related: dedupeRelated(
      related.filter((w) => w.berlinerisch !== word),
      exclude,
    ),
  };
}

/** The card renders (and gets a tab) only with at least one related word or neighbour left. */
export function hasNeighborhood<R extends { berlinerisch: string; slug: string }, N extends { berlinerisch: string }>(
  input: NeighborhoodInput<R, N>,
): boolean {
  const { related, before, after } = neighborhoodWords(input);
  return related.length + before.length + after.length > 0;
}
