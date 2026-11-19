const FALLBACK_TEXT = "#6f6f6f";
const FALLBACK_GRID = "#e3e3e3";
const FALLBACK_SERIES = [
  "#2f9e6b", // views / like
  "#d9822b",
  "#4a7bd0",
  "#c0504d",
  "#8a63c8",
  "#2a9fb5",
  "#b5a12a",
  "#7d7d7d",
];
/** Admin CSS variables (Payload 3) that replace the first series colors when they exist. */
const SERIES_VARS = [
  "--theme-success-500",
  "--theme-warning-500",
  "--theme-elevation-600",
  "--theme-error-500",
];

export type ThemeColors = { text: string; grid: string; series: string[] };

/** Chart.js draws on a canvas and cannot read CSS: the admin variables come in as values, with fixed fallbacks. */
export const pickColors = (get: (name: string) => string): ThemeColors => {
  const value = (name: string, fallback: string) => get(name).trim() || fallback;
  return {
    text: value("--theme-elevation-800", FALLBACK_TEXT),
    grid: value("--theme-elevation-150", FALLBACK_GRID),
    series: FALLBACK_SERIES.map((fallback, i) =>
      SERIES_VARS[i] ? value(SERIES_VARS[i], fallback) : fallback,
    ),
  };
};

export const readThemeColors = (el: HTMLElement): ThemeColors => {
  const style = getComputedStyle(el);
  return pickColors((name) => style.getPropertyValue(name));
};
