import { persistentAtom } from "@nanostores/persistent";

export type DarkMode = boolean | null;

export const $isDarkMode = persistentAtom<DarkMode>("darkMode", null, {
  decode(value) {
    if (value == null || value === "null") return null;
    try {
      return JSON.parse(value) as boolean;
    } catch (err) {
      console.warn("[darkMode] Failed to parse persisted darkMode value:", value, err);
      return null;
    }
  },
  encode(value) {
    return JSON.stringify(value);
  },
});

export const setDarkMode = (value: DarkMode): void => {
  $isDarkMode.set(value);

  if (typeof document === "undefined") return;

  const resolved = value === null
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : value;

  document.documentElement.classList.toggle("dark", resolved);
  document.documentElement.classList.toggle("cc--darkmode", resolved);
  document.documentElement.style.colorScheme = resolved ? "dark" : "light";
  document.querySelector("meta[name=theme-color]")
    ?.setAttribute("content", resolved ? "#2b333b" : "#fad0b0");
};
