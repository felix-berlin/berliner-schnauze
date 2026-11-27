import type { AgeGroup, ContentKey, SortKey } from "./types";

import { FILTER_GROUPS } from "./labels";

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

/** "beste" needs a query: without one it means A-Z. */
export const effectiveSort = (s: SearchState): SortKey =>
  s.sort === "beste" && !s.q ? "az" : (s.sort ?? (s.q ? "beste" : "az"));

/** The filter chips (SPEC §7.1); „Nur Berolinismen“ is a toggle, not a group. */
export type FilterGroup = "buchstabe" | "wortart" | "thema" | "gebrauch" | "inhalt" | "wortform";

/** Selected values in one group (the chip's count pill): two word types count 2. */
export const groupFilterCount = (s: SearchState, group: FilterGroup): number => {
  switch (group) {
    case "buchstabe":
      return s.letter ? 1 : 0;
    case "wortart":
      return s.pos.length;
    case "thema":
      return s.themes.length;
    case "gebrauch":
      return [s.often, s.where, s.area, s.age].filter(Boolean).length;
    case "inhalt":
      return s.content.length;
    case "wortform":
      return [s.starts, s.ends, s.rhyme, s.syllables, s.length].filter(Boolean).length;
  }
};

/** One per chip value: two selected word types count 2. */
export const activeFilterCount = (s: SearchState): number =>
  FILTER_GROUPS.reduce((n, { group }) => n + groupFilterCount(s, group), s.berolinismus ? 1 : 0);

export const isFiltered = (s: SearchState): boolean => activeFilterCount(s) > 0;

/** SPEC §6.4: in the start state (no query, no letter) the register replaces the „Buchstabe“ chip. */
export const showsLetterChip = (s: SearchState): boolean => !!s.q || !!s.letter;

/** The groups the bar and the mobile sheet show, in chip order. */
export const visibleGroups = (s: SearchState) =>
  FILTER_GROUPS.filter((g) => g.group !== "buchstabe" || showsLetterChip(s));
