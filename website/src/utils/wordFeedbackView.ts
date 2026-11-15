// Pure display maths of the word feedback card (WordFeedbackCard.vue): result bars, step segments, comparison rows.

type Totals = Partial<Record<string, number>>;
type Compare = {
  area: number | null;
  east: number | null;
  locality: number | null;
  moved: number | null;
  west: number | null;
};

export const plural = (n: number) => `${n} ${n === 1 ? "Stimme" : "Stimmen"}`;

/** One bar per usage option; `percent` is the rounded share of all votes (0 without votes). */
export const usageBars = <V extends string>(
  options: readonly { label: string; value: V }[],
  totals: Totals | undefined,
  total: number,
) =>
  options.map((o) => {
    const n = totals?.[o.value] ?? 0;
    return {
      label: o.label,
      percent: total ? Math.round((n / total) * 100) : 0,
      text: plural(n),
      value: o.value,
    };
  });

/** Always one segment per step in `all`, so the bar does not jump when optional steps come or go. */
export const progressSegments = (
  all: readonly string[],
  active: readonly string[],
  current: string,
) => {
  const at = all.indexOf(current);
  return all.map((step, i) => {
    if (!active.includes(step)) return { state: "skipped", step };
    if (current === "done" || i < at) return { state: "done", step };
    return { state: i === at ? "current" : "open", step };
  });
};

/** Comparison groups below the minimum size come back as null and get no row. */
export const compareRows = (
  c: Compare | undefined,
  areaName: string | null | undefined,
  localityName: string | null | undefined,
) => {
  if (!c) return [];
  return [
    { label: "Ost-Berliner", share: c.east },
    { label: "West-Berliner", share: c.west },
    { label: "Zujezogene", share: c.moved },
    { label: `in ${areaName}`, share: areaName ? c.area : null },
    { label: `in ${localityName}`, share: localityName ? c.locality : null },
  ].filter((r): r is { label: string; share: number } => r.share !== null);
};
