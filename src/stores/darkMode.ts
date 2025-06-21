import { persistentAtom } from "@nanostores/persistent";

export type DarkMode = boolean;

export const $isDarkMode = persistentAtom<DarkMode>("darkMode", false, {
  decode(value) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  },
  encode(value) {
    return JSON.stringify(value);
  },
});

export const setDarkMode = (value: DarkMode) => {
  $isDarkMode.set(value);
};
