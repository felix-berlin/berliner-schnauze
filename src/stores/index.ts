import { atom, action, map, computed } from "nanostores";
import { persistentAtom } from "@nanostores/persistent";

export * from "@stores/wordList";
export * from "@stores/wordOfTheDay";

export type DarkMode = boolean;

export const isDarkMode = persistentAtom<DarkMode>("darkMode", false, {
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
