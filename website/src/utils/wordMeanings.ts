/** How many meanings are visible before the "Alle n Bedeutungen zeigen" toggle. */
const MEANINGS_VISIBLE = 5;

/** Shows the first `limit` meanings; the rest sits behind "Alle {n} Bedeutungen zeigen". */
export const splitMeanings = (
  meanings: string[],
  limit = MEANINGS_VISIBLE,
): { hidden: string[]; visible: string[] } => ({
  hidden: meanings.slice(limit),
  visible: meanings.slice(0, limit),
});
