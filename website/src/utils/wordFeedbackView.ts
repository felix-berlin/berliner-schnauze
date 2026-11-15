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

export type Step = "age" | "area" | "done" | "half" | "locality" | "origin" | "usage";
export type ProfileStep = Exclude<Step, "done" | "usage">;

export const QUESTIONS = {
  age: "Wie alt biste?",
  area: "Wo wohnste?",
  half: "In welcher Hälfte?",
  locality: "Welcher Kiez?",
  origin: "Uffjewachsen oder zujezogen?",
};
// The localities come from the chosen area (`choices` in the flow).
export const CHOICES: Record<
  Exclude<ProfileStep, "area" | "locality">,
  { label: string; value: string }[]
> = {
  age: [
    { label: "unter 20", value: "u20" },
    { label: "20–29", value: "20-29" },
    { label: "30–39", value: "30-39" },
    { label: "40–49", value: "40-49" },
    { label: "50–59", value: "50-59" },
    { label: "60–69", value: "60-69" },
    { label: "70–79", value: "70-79" },
    { label: "80+", value: "80plus" },
  ],
  half: [
    { label: "Ost", value: "east" },
    { label: "West", value: "west" },
    { label: "Beides / nach der Wende", value: "both" },
  ],
  origin: [
    { label: "Hier uffjewachsen", value: "grewUp" },
    { label: "Zujezogen, über 10 Jahre her", value: "movedOver10" },
    { label: "Zujezogen, unter 10 Jahren", value: "movedUnder10" },
  ],
};
/** Step order: decides the slide direction of the enter animation. */
export const ORDER: Step[] = ["usage", "area", "locality", "origin", "half", "age", "done"];
/** Always six segments, so the bar does not jump when the optional steps come or go. */
export const ALL_STEPS = ["usage", "area", "locality", "origin", "half", "age"];
