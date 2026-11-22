import { AREAS, type Area } from "payload-app/word-feedback";

// Start page dot map and age profile (docs/design/startseite-v20/SPEC.md §11).

/** The fixed dot grid of the 12 districts (`assets/berlin-bezirke-punkte.json`); a dot is [x, y, wave delay in ms]. */
export type Dot = readonly [x: number, y: number, delayMs: number];
export type Geometry = {
  viewBox: { width: number; height: number };
  bezirke: { slug: Area; name: string; dots: readonly Dot[] }[];
};

type GeometryJson = {
  viewBox: string;
  bezirke: { slug: string; name: string; dots: number[][] }[];
};

/** Checks the geometry file once at load (a typo would otherwise show as a silently muted district) and types it. */
export function toGeometry(json: GeometryJson): Geometry {
  const [, , width, height] = json.viewBox.split(" ").map(Number);
  if (!width || !height) throw new Error(`Malformed geometry viewBox "${json.viewBox}"`);
  return {
    bezirke: json.bezirke.map(({ dots, name, slug }) => {
      const area = AREAS.find((a) => a === slug);
      if (!area) throw new Error(`Unknown district slug "${slug}" in the geometry`);
      return {
        dots: dots.map(([x, y, delay]) => {
          if (x === undefined || y === undefined || delay === undefined) {
            throw new Error(`Short dot in district "${slug}"`);
          }
          return [x, y, delay] as const;
        }),
        name,
        slug: area,
      };
    }),
    viewBox: { height, width },
  };
}

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

/** The dot grid spacing is about 8.4 units: a point further than this from every dot is outside the map. */
const HIT_RANGE = 9;

/** Slug of the district whose dot is nearest to a point in viewBox units (the whole area is the hit target, not just the dots). */
export function nearestDistrict(geometry: Geometry, x: number, y: number): Area | null {
  let best: Area | null = null;
  let min = HIT_RANGE * HIT_RANGE;
  for (const b of geometry.bezirke) {
    for (const [dx, dy] of b.dots) {
      const d = (dx - x) ** 2 + (dy - y) ** 2;
      if (d < min) {
        min = d;
        best = b.slug;
      }
    }
  }
  return best;
}
