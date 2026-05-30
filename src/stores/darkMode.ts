import { persistentAtom } from "@nanostores/persistent";

export type DarkMode = boolean | null;

export const $isDarkMode = persistentAtom<DarkMode>("darkMode", null, {
  decode(value) {
    if (value == null || value === "null") return null;
    try {
      return JSON.parse(value) as boolean;
    } catch {
      return null;
    }
  },
  encode(value) {
    return JSON.stringify(value);
  },
});

export const setDarkMode = (value: DarkMode) => {
  $isDarkMode.set(value);
};
