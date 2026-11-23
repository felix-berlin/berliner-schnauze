// Pure display maths of the word feedback card (WordPoll.vue): step segments, choices, profile patch.

export const plural = (n: number) =>
  `${n.toLocaleString("de-DE")} ${n === 1 ? "Stimme" : "Stimmen"}`;

export { largestRemainder } from "@lib/largestRemainder.ts";

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
/** Always six segments, so the bar does not jump when the optional steps come or go. */
export const ALL_STEPS = ["usage", "area", "locality", "origin", "half", "age"];

/** Areas outside Berlin: no half question. */
export const NOT_BERLIN = new Set<string>(["brandenburg", "elsewhere"]);

/**
 * The PATCH body for one profile answer. The API takes a half only with origin grewUp, a locality only with its
 * area, and a new area drops the old locality; outside Berlin it drops the half too.
 */
export const profilePatch = (
  key: ProfileStep,
  value: string | null,
  ctx: { area: string | null | undefined; hadLocality: unknown },
): Record<string, string | null | undefined> => ({
  [key]: value,
  ...(key === "origin" && value !== "grewUp" ? { half: null } : {}),
  ...(key === "area" && NOT_BERLIN.has(value ?? "") ? { half: null } : {}),
  ...(key === "half" && value ? { origin: "grewUp" } : {}),
  ...(key === "locality" && value ? { area: ctx.area } : {}),
  ...(key === "area" && ctx.hadLocality ? { locality: null } : {}),
});
