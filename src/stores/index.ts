import { persistentAtom } from "@nanostores/persistent";

export * from "@stores/wordList";
export * from "@stores/wordOfTheDay";
export * from "@stores/installApp";
export * from "@stores/toastNotify";

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
