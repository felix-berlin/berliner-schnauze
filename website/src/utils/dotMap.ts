// Start page dot map and age profile (docs/design/startseite-v20/SPEC.md §11).

/** The fixed dot grid of the 12 districts (`assets/berlin-bezirke-punkte.json`); a dot is [x, y, wave delay in ms]. */
export type Geometry = {
  viewBox: string;
  bezirke: { slug: string; name: string; dots: number[][] }[];
};

/** Rounded to 3 decimals, so the SSR markup stays stable. */
const num = (n: number) => Math.round(n * 1000) / 1000;
const clamp = (n: number) => Math.min(Math.max(n, 0), 1);

/** Dot radius and opacity of a district from its „Sag ick selbst“ share; without a value the district is muted. */
export function dotStyle(v: number | null): { r: number; opacity: number; muted: boolean } {
  if (v === null) return { muted: true, opacity: 0.2, r: 1.6 };
  return {
    muted: false,
    opacity: num(0.18 + 0.82 * clamp((v - 30) / 56)),
    r: num(1.6 + (2 * v) / 100),
  };
}

/** Filled dots of an age column, one per 10 %; a group below MIN_GROUP has no value and stays empty. */
export const filledDots = (percent: number | null): number =>
  percent === null ? 0 : Math.round(percent / 10);
