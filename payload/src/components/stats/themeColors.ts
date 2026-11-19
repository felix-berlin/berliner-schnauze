import { color } from "chart.js/helpers";

const FALLBACK_TEXT = "#6f6f6f";
const FALLBACK_GRID = "#e3e3e3";
/**
 * Series colors as [admin CSS variable, fallback]: the variable wins when the admin defines it. Series 2 follows the
 * elevation grey on purpose; its blue fallback only shows where the variable is missing.
 */
const SERIES: readonly (readonly [string | null, string])[] = [
  ["--theme-success-500", "#2f9e6b"], // views / like
  ["--theme-warning-500", "#d9822b"],
  ["--theme-elevation-600", "#4a7bd0"],
  ["--theme-error-500", "#c0504d"],
  [null, "#8a63c8"],
  [null, "#2a9fb5"],
  [null, "#b5a12a"],
  [null, "#7d7d7d"],
];

export type ThemeColors = { text: string; grid: string; series: string[] };

/** Chart.js draws on a canvas and cannot read CSS: the admin variables come in as values, with fixed fallbacks. */
export const pickColors = (get: (name: string) => string): ThemeColors => {
  const value = (name: string, fallback: string) => get(name).trim() || fallback;
  return {
    text: value("--theme-elevation-800", FALLBACK_TEXT),
    grid: value("--theme-elevation-150", FALLBACK_GRID),
    series: SERIES.map(([name, fallback]) => (name ? value(name, fallback) : fallback)),
  };
};

export const readThemeColors = (el: HTMLElement): ThemeColors => {
  const style = getComputedStyle(el);
  return pickColors((name) => style.getPropertyValue(name));
};

/** `color` with transparency: the admin variables hold `rgb(…)`, so appending a hex alpha would be invalid. */
export const withAlpha = (value: string, alpha: number): string =>
  color(value).alpha(alpha).rgbString();
