import { persistentAtom } from "@nanostores/persistent";

export type UpdateMode = "prompt" | "auto" | "next-start";

export interface OfflineDictionarySettings {
  enabled: boolean;
  wifiOnly: boolean;
  /** package.json version of the last complete download, null = never / invalidated. */
  syncedVersion: string | null;
  /** package.json version whose download ended in an error; blocks automatic retries. */
  failedVersion: string | null;
}

const UPDATE_MODES = new Set<UpdateMode>(["prompt", "auto", "next-start"]);

export const DEFAULT_OFFLINE_DICTIONARY: OfflineDictionarySettings = {
  enabled: false,
  failedVersion: null,
  syncedVersion: null,
  wifiOnly: true,
};

export const $updateMode = persistentAtom<UpdateMode>("pwaUpdateMode", "prompt", {
  decode: (value) => (UPDATE_MODES.has(value as UpdateMode) ? (value as UpdateMode) : "prompt"),
  encode: (value) => value,
});

export const $offlineDictionary = persistentAtom<OfflineDictionarySettings>(
  "pwaOfflineDictionary",
  DEFAULT_OFFLINE_DICTIONARY,
  {
    decode(value) {
      try {
        return {
          ...DEFAULT_OFFLINE_DICTIONARY,
          ...(JSON.parse(value) as Partial<OfflineDictionarySettings>),
        };
      } catch (err) {
        console.warn("[pwaSettings] Failed to parse offline dictionary settings:", value, err);
        return DEFAULT_OFFLINE_DICTIONARY;
      }
    },
    encode: JSON.stringify,
  },
);

export function patchOfflineDictionary(patch: Partial<OfflineDictionarySettings>): void {
  $offlineDictionary.set({ ...$offlineDictionary.get(), ...patch });
}
