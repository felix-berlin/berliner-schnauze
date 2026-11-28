import type { AgeGroup } from "payload-app/home-stats";

export { AGE_GROUPS } from "payload-app/home-stats";

import type { OramaSearchIndex } from "@/pages/api/search/index.json";

export type { AgeGroup };
/** `say` = share 0..1 of "Sag ick selbst". */
export type Share = { say: number; votes: number };
export type Usage = Share & {
  east?: number;
  west?: number;
  areas?: Partial<Record<string, Share>>;
  ages?: Partial<Record<AgeGroup, Share>>;
};
/** Filter keys in display order; labels.ts maps each to its copy, url.ts and facets.ts read them. */
export const CONTENT_KEYS = [
  "audio",
  "beispiele",
  "beispiele-audio",
  "bilder",
  "jeschichten",
  "wissenswertes",
  "luecke",
] as const;
export type ContentKey = (typeof CONTENT_KEYS)[number];
export const SORT_KEYS = ["beste", "az", "beliebt", "neu", "jesagt"] as const;
export type SortKey = (typeof SORT_KEYS)[number];
/** word-exact, word-prefix, word, meaning-exact, meaning-part, fuzzy */
export type Tier = 0 | 1 | 2 | 3 | 4 | 5;
export type SearchEntry = OramaSearchIndex & {
  article: string;
  /** Url of the first Berlinerisch recording, absent without audio. */
  audio?: string;
  has: {
    examples: boolean;
    examplesAudio: boolean;
    images: boolean;
    stories: boolean;
    facts: boolean;
    gap: boolean;
  };
  form: { syllables: number; length: number; soundex: string };
  usage?: Usage;
};
export type RankedHit = { entry: SearchEntry; tier: Tier };
export type ListRow =
  | { kind: "hit"; hit: RankedHit }
  | { kind: "divider"; label: "Ab hier: Treffer in der Bedeutung" | "Klingt ähnlich" }
  | { kind: "letter"; letter: string; count: number };
