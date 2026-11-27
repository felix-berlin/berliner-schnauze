import type { AgeGroup, ContentKey, SortKey } from "./types";

export type SearchState = {
  q: string;
  letter?: string;
  pos: string[];
  themes: string[];
  often?: "oft" | "manchmal" | "kaum";
  where?: "ost" | "west" | "beides";
  area?: string;
  age?: AgeGroup;
  content: ContentKey[];
  starts?: string;
  ends?: string;
  rhyme?: string;
  syllables?: 1 | 2 | 3 | 4;
  length?: "kurz" | "mittel" | "lang";
  berolinismus: boolean;
  sort?: SortKey;
};

export const EMPTY_STATE: SearchState = {
  berolinismus: false,
  content: [],
  pos: [],
  q: "",
  themes: [],
};

export const effectiveSort = (s: SearchState): SortKey => s.sort ?? (s.q ? "beste" : "az");

/** One per chip value: two selected word types count 2. */
export const activeFilterCount = (s: SearchState): number =>
  s.pos.length +
  s.themes.length +
  s.content.length +
  [
    s.letter,
    s.often,
    s.where,
    s.area,
    s.age,
    s.starts,
    s.ends,
    s.rhyme,
    s.syllables,
    s.length,
    s.berolinismus || undefined,
  ].filter(Boolean).length;

export const isFiltered = (s: SearchState): boolean => activeFilterCount(s) > 0;
