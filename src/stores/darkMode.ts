import { persistentAtom } from "@nanostores/persistent";
import { action } from "nanostores";

export type DarkMode = boolean;

export const $isDarkMode = persistentAtom<DarkMode>("darkMode", false, {
  encode(value) {
    return JSON.stringify(value);
  },
  decode(value) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  },
});

export const setDarkMode = action($isDarkMode, "setDarkMode", (store, value: DarkMode) => {
  store.set(value);
});
