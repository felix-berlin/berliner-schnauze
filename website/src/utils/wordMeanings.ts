/** Shows the first `limit` meanings; the rest sits behind "Alle {n} Bedeutungen zeigen". */
export const splitMeanings = (
  meanings: string[],
  limit = 5,
): { hidden: string[]; visible: string[] } => ({
  hidden: meanings.slice(limit),
  visible: meanings.slice(0, limit),
});
