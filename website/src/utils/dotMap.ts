import { AREAS, type Area } from "payload-app/word-feedback";

// Start page dot map and age profile (docs/design/startseite-v20/SPEC.md §11).

/**
 * The fixed dot grid of the 12 districts (`assets/berlin-bezirke-punkte.json`). Each district is one path of
 * zero-length subpaths (`M x y h0`) that `stroke-linecap: round` draws as dots; `x` is the dots' mean, `top` and
 * `bottom` the outer dot rows (tooltip). `wave` is the centre and reach of the fade-in wave, in viewBox units.
 */
export type Geometry = {
  viewBox: { width: number; height: number };
  wave: { x: number; y: number; reach: number };
  bezirke: { slug: Area; name: string; path: string; x: number; top: number; bottom: number }[];
};

type GeometryJson = {
  viewBox: string;
  wave: { x: number; y: number; reach: number };
  bezirke: { slug: string; name: string; path: string; x: number; top: number; bottom: number }[];
};

/** Checks the geometry file once at load (a typo would otherwise show as a silently muted district) and types it. */
export function toGeometry(json: GeometryJson): Geometry {
  const [, , width, height] = json.viewBox.split(" ").map(Number);
  if (!width || !height) throw new Error(`Malformed geometry viewBox "${json.viewBox}"`);
  return {
    bezirke: json.bezirke.map(({ bottom, name, path, slug, top, x }) => {
      const area = AREAS.find((a) => a === slug);
      if (!area) throw new Error(`Unknown district slug "${slug}" in the geometry`);
      if (!/^(M[\d.]+ [\d.]+h0)+$/.test(path))
        throw new Error(`Malformed dot path in district "${slug}"`);
      return { bottom, name, path, slug: area, top, x };
    }),
    viewBox: { height, width },
    wave: json.wave,
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
