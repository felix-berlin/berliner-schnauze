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

interface WordSectionFacts {
  hasOrigin: boolean;
  hasExamples: boolean;
  draft: boolean;
}

/** Tabs and sidebar links of the word page, in page order (Spec §2); only sections that render. */
export function buildWordSections({
  hasOrigin,
  hasExamples,
  draft,
}: WordSectionFacts): WordSection[] {
  const all: (WordSection & { show: boolean })[] = [
    { id: "bedeutung", label: "Bedeutung", show: true },
    { id: "sagste-det-noch", label: "Umfrage", show: !draft },
    { id: "etymologie", label: "Etymologie", show: hasOrigin },
    { id: "beispiele", label: "Beispiele", show: hasExamples },
    { id: "analyse", label: "Analyse", show: true },
    { id: "verwandte-worte", label: "Umfeld", show: true },
    { id: "kommentare", label: "Kommentare", show: !draft },
  ];
  return all.filter((s) => s.show).map(({ id, label }) => ({ id, label }));
}
