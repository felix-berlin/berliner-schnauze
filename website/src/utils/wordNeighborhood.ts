/** Related words minus those the analysis band already lists (matched by slug). */
export function dedupeRelated<T extends { slug: string }>(related: T[], exclude: string[]): T[] {
  const skip = new Set(exclude);
  return related.filter((w) => !skip.has(w.slug));
}
