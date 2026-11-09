export type WordSectionId =
  | "bedeutung"
  | "sagste-det-noch"
  | "etymologie"
  | "beispiele"
  | "analyse"
  | "verwandte-worte"
  | "kommentare";

export interface WordSection {
  id: WordSectionId;
  label: string;
}

/** The etymology card renders for an origin text or sources (meanings and alternatives live in the hero). */
export function hasOrigin(word: {
  infoTextHtml?: string | null | undefined;
  sources?: (string | null | undefined)[] | null | undefined;
}): boolean {
  return Boolean(word.infoTextHtml) || (word.sources ?? []).some(Boolean);
}

interface WordSectionFacts {
  hasOrigin: boolean;
  hasExamples: boolean;
  /** See hasNeighborhood in wordNeighborhood.ts. */
  hasNeighborhood: boolean;
  draft: boolean;
}

/** Tabs and sidebar links of the word page, in page order (Spec §2); only sections that render. */
export function buildWordSections({
  hasOrigin: withOrigin, // renamed: the exported hasOrigin() above would be shadowed
  hasExamples,
  hasNeighborhood,
  draft,
}: WordSectionFacts): WordSection[] {
  const all: (WordSection & { show: boolean })[] = [
    { id: "bedeutung", label: "Bedeutung", show: true },
    { id: "sagste-det-noch", label: "Umfrage", show: !draft },
    { id: "etymologie", label: "Etymologie", show: withOrigin },
    { id: "beispiele", label: "Beispiele", show: hasExamples },
    { id: "analyse", label: "Analyse", show: true },
    { id: "verwandte-worte", label: "Umfeld", show: hasNeighborhood },
    { id: "kommentare", label: "Kommentare", show: !draft },
  ];
  return all.filter((s) => s.show).map(({ id, label }) => ({ id, label }));
}
