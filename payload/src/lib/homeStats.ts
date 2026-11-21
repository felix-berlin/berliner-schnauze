import { MIN_GROUP, type AGES, type Usage } from "./wordFeedback";

// Pure helpers for the start page (`payload-app/home-stats`): Morse ring, age groups and the word-vote threshold.

/** Votes (with an age) a word needs before it enters the age lists. TODO(startseite): interim value, to be decided. */
export const MIN_WORD_VOTES = 30;

/** Shared shape of a word reference without `id`; the site's own `WordRef` extends it. */
export type WordRef = { slug: string; berlinerisch: string };

/** One mark on the Morse ring: `x`/`y` are the centre in percent of the seal (0..100), `angle` the rotation in degrees. */
export type MorseMark = { sym: "dot" | "dash"; x: number; y: number; angle: number };

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
const num = (n: number) => Math.round(n * 1000) / 1000;

// Arc lengths in px of the 120px seal (SPEC 5.1 sizes: dot 8, dash 18); the seal scales them with its size.
// Every mark takes its real length on the ring, so a dash never touches its neighbour (the SPEC's one-unit-per-mark
// spacing made dots and dashes run together). COUPLING: _word-seal.scss `--_dot`/`--_dash`.
const DOT = 8;
const DASH = 18;
const GAP_MARK = 4; // between marks of one letter
const GAP_LETTER = 9; // between letters and where the ring closes
const RING_ARC = 2 * Math.PI * 54; // radius 45% of 120px

/** Marks on a ring (SPEC 5.1); characters outside the table are skipped, whole letters only while they fit the arc. */
export function morseRing(word: string): MorseMark[] {
  const codes: string[] = [];
  let arc = GAP_LETTER; // the closing gap
  for (const ch of word) {
    // "ß".toUpperCase() is "SS", the table has its own entry
    const code = MORSE[ch === "ß" ? ch : ch.toUpperCase()];
    if (!code) continue;
    const length =
      [...code].reduce((sum, sym) => sum + (sym === "." ? DOT : DASH), 0) +
      (code.length - 1) * GAP_MARK +
      (codes.length ? GAP_LETTER : 0);
    if (arc + length > RING_ARC) break;
    codes.push(code);
    arc += length;
  }

  let t = 0;
  const centres: number[] = [];
  const syms: MorseMark["sym"][] = [];
  for (const code of codes) {
    if (centres.length) t += GAP_LETTER;
    [...code].forEach((sym, i) => {
      if (i) t += GAP_MARK;
      const size = sym === "." ? DOT : DASH;
      centres.push(t + size / 2);
      syms.push(sym === "." ? "dot" : "dash");
      t += size;
    });
  }
  t += GAP_LETTER;

  return centres.map((u, i) => {
    const a = -90 + (360 * u) / t;
    const r = (a * Math.PI) / 180;
    return {
      sym: syms[i],
      x: num(50 + 45 * Math.cos(r)),
      y: num(50 + 45 * Math.sin(r)),
      angle: num(a + 90),
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

export type UsageCounts = Record<Usage, number>;

/** Share of "say" in percent, rounded; null below MIN_GROUP votes. */
export function districtValue(counts: UsageCounts): number | null {
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  return total < MIN_GROUP ? null : Math.round((counts.say / total) * 100);
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
 * districts); only a gap above 0 counts, so null when no word beats its own share. Entries below MIN_GROUP votes are
 * ignored, ties go to the lower word id.
 */
export function typicalWord(
  perWord: { word: number; say: number; total: number; citySay: number }[],
): number | null {
  let best: number | null = null;
  let gap = 0;
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
