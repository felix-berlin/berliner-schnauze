/** Relation keys in the order of their importance (SPEC §10); also the order of the groups. */
export const RELATION_ORDER = ["gleich", "gegenteil", "verwandt", "redewendung"] as const;

export const RELATION_LABEL: Record<(typeof RELATION_ORDER)[number], string> = {
  gegenteil: "Gegenteil",
  gleich: "Gleiche Bedeutung",
  redewendung: "In Redewendung",
  verwandt: "Verwandt",
};

/** An entry without a known relation counts as "verwandt". */
export const relationKey = (relation?: string): (typeof RELATION_ORDER)[number] =>
  RELATION_ORDER.find((r) => r === relation) ?? "verwandt";

const NET_SIZE = 4;

/** The four most important related words for the net (relation order, then alphabetical); the rest is a list. */
export const pickNetwork = <T extends { label: string; relation?: string | undefined }>(
  related: readonly T[],
): { net: T[]; rest: T[] } => {
  const rank = (r: T) => {
    const i = RELATION_ORDER.findIndex((k) => k === r.relation);
    return i === -1 ? RELATION_ORDER.length : i;
  };
  const sorted = related.toSorted(
    (a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label, "de"),
  );
  return { net: sorted.slice(0, NET_SIZE), rest: sorted.slice(NET_SIZE) };
};
