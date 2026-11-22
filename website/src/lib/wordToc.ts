import type { WordPageModel } from "@services/payload/wordPage.ts";

export type TocItem = { id: string; label: string; count?: number };

/** The seven entries of the table of contents (SPEC §2), in page order; a count only when greater than 0. */
export const tocItems = (
  {
    related,
    stories,
    word,
  }: Pick<WordPageModel, "related" | "stories"> & {
    word: { examples: { example?: string | null }[] };
  },
  draft = false,
): TocItem[] => {
  const entry = (id: string, label: string, count = 0): TocItem => ({
    id,
    label,
    ...(count > 0 && { count }),
  });
  const items = [
    entry("bedeutung", "Bedeutung"),
    entry("beispiele", "Beispiele", word.examples.filter((e) => e.example).length),
    entry("sagste", "Sagste det noch?"),
    entry("jeschichten", "Jeschichten", stories.total),
    entry("wissenswertes", "Wissenswertes"),
    entry("verwandt", "Verwandte Wörter", related.length),
    entry("analyse", "Analyse"),
  ];
  // A draft has no poll and no Jeschichten (they would write against the live word).
  return draft ? items.filter((i) => i.id !== "sagste" && i.id !== "jeschichten") : items;
};
