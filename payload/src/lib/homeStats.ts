import type { AGES } from "./wordFeedback";

// Pure helpers for the start page (`payload-app/home-stats`): Morse ring, age groups and the privacy threshold.

/** Fewer votes than this in a group are never shown. */
export const MIN_GROUP = 10;
// TODO(startseite): interim value, decide how many votes a word needs before it counts as "typical".
export const MIN_WORD_VOTES = 30;

export type MorseMark = { sym: "d" | "l"; left: string; top: string; rotate: string };

// TODO(startseite): interim rule for long words: whole letters from the start while the marks fit.
export const MORSE_MAX_MARKS = 28;

const MORSE: Record<string, string> = {
  A: ".-",
  B: "-...",
  C: "-.-.",
  D: "-..",
  E: ".",
  F: "..-.",
  G: "--.",
  H: "....",
  I: "..",
  J: ".---",
  K: "-.-",
  L: ".-..",
  M: "--",
  N: "-.",
  O: "---",
  P: ".--.",
  Q: "--.-",
  R: ".-.",
  S: "...",
  T: "-",
  U: "..-",
  V: "...-",
  W: ".--",
  X: "-..-",
  Y: "-.--",
  Z: "--..",
  Ä: ".-.-",
  Ö: "---.",
  Ü: "..--",
  ß: "...--..",
};

/** Rounded to 3 decimals, so positions stay stable in tests. */
const num = (n: number) => `${Math.round(n * 1000) / 1000}`;

/** Marks on a ring (SPEC 5.1); characters outside the table are skipped, whole letters only up to MORSE_MAX_MARKS. */
export function morseRing(word: string): MorseMark[] {
  const codes: string[] = [];
  let marks = 0;
  for (const ch of word) {
    // "ß".toUpperCase() is "SS", the table has its own entry
    const code = MORSE[ch === "ß" ? ch : ch.toUpperCase()];
    if (!code) continue;
    if (marks + code.length > MORSE_MAX_MARKS) break;
    codes.push(code);
    marks += code.length;
  }

  let t = 0;
  const units: number[] = [];
  const syms: MorseMark["sym"][] = [];
  for (const code of codes) {
    if (units.length) t += 0.9; // gap between letters
    for (const sym of code) {
      units.push(t + 0.5);
      syms.push(sym === "." ? "d" : "l");
      t += 1;
    }
  }
  t += 0.9; // gap where the ring closes

  return units.map((u, i) => {
    const a = -90 + (360 * u) / t;
    const r = (a * Math.PI) / 180;
    return {
      sym: syms[i],
      left: `${num(50 + 45 * Math.cos(r))}%`,
      top: `${num(50 + 45 * Math.sin(r))}%`,
      rotate: `${num(a + 90)}deg`,
    };
  });
}

export const AGE_GROUPS = ["u30", "30-49", "50-69", "70plus"] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

const AGE_TO_GROUP: Record<(typeof AGES)[number], AgeGroup> = {
  u20: "u30",
  "20-29": "u30",
  "30-39": "30-49",
  "40-49": "30-49",
  "50-59": "50-69",
  "60-69": "50-69",
  "70-79": "70plus",
  "80plus": "70plus",
};

export const ageGroup = (age: (typeof AGES)[number]): AgeGroup => AGE_TO_GROUP[age];

export type UsageCounts = { say: number; know: number; never: number };

/** Share of "say" in percent, rounded; null below MIN_GROUP votes. */
export function districtValue({ say, know, never }: UsageCounts): number | null {
  const total = say + know + never;
  return total < MIN_GROUP ? null : Math.round((say / total) * 100);
}

export const agePercents = (
  byGroup: Record<AgeGroup, UsageCounts>,
): Record<AgeGroup, number | null> =>
  Object.fromEntries(AGE_GROUPS.map((g) => [g, districtValue(byGroup[g])])) as Record<
    AgeGroup,
    number | null
  >;

/**
 * Word whose say share in the district is furthest above its own Berlin share (`citySay`, 0..1 across the 12
 * districts); entries below MIN_GROUP votes are ignored, ties go to the lower word id.
 */
export function typicalWord(
  perWord: { word: number; say: number; total: number; citySay: number }[],
): number | null {
  let best: number | null = null;
  let gap = -Infinity;
  for (const { word, say, total, citySay } of perWord) {
    if (total < MIN_GROUP) continue;
    const g = say / total - citySay;
    if (g > gap || (g === gap && best !== null && word < best)) {
      gap = g;
      best = word;
    }
  }
  return best;
}
