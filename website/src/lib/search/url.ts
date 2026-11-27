import type { SearchState } from "./state";
import type { AgeGroup, ContentKey, SortKey } from "./types";

import { EMPTY_STATE, effectiveSort } from "./state";

type Known = { pos: string[]; themes: string[]; areas: string[] };

const AGES: AgeGroup[] = ["u30", "30-49", "50-69", "70plus"];
const OFTEN = ["oft", "manchmal", "kaum"] as const;
const WHERE = ["ost", "west", "beides"] as const;
const CONTENT: ContentKey[] = [
  "audio",
  "beispiele",
  "beispiele-audio",
  "bilder",
  "jeschichten",
  "wissenswertes",
  "luecke",
];
const SYLLABLES = [1, 2, 3, 4] as const;
const LENGTHS = ["kurz", "mittel", "lang"] as const;
const SORTS: SortKey[] = ["beste", "az", "beliebt", "neu", "jesagt"];
const MAX_TEXT = 30;

const one = <T extends string>(value: string | null, allowed: readonly T[]): T | undefined =>
  allowed.find((a) => a === value);

/** Comma list, matched case-insensitively against `allowed`, canonical values, deduplicated. */
const list = <T extends string>(value: string | null, allowed: readonly T[]): T[] => {
  const out = new Set<T>();
  for (const raw of (value ?? "").split(",")) {
    const hit = allowed.find((a) => a.toLowerCase() === raw.trim().toLowerCase());
    if (hit) out.add(hit);
  }
  return [...out];
};

const text = (value: string | null): string | undefined =>
  value?.trim().slice(0, MAX_TEXT).trim() || undefined;

export function parseState(params: URLSearchParams, known: Known): SearchState {
  const letter = params.get("buchstabe")?.trim().toLocaleUpperCase("de");
  const syllables = Number(params.get("silben"));
  return {
    ...EMPTY_STATE,
    age: one(params.get("alter"), AGES),
    area: list(params.get("bezirk"), known.areas)[0],
    berolinismus: params.get("berolinismus") === "1",
    content: list(params.get("inhalt"), CONTENT),
    ends: text(params.get("endet")),
    length: one(params.get("laenge"), LENGTHS),
    often: one(params.get("gebrauch"), OFTEN),
    letter: letter && /^[A-ZÄÖÜ]$/.test(letter) ? letter : undefined,
    pos: list(params.get("wortart"), known.pos),
    q: params.get("q") ?? "",
    rhyme: text(params.get("reim")),
    sort: one(params.get("sort"), SORTS),
    starts: text(params.get("beginnt")),
    syllables: SYLLABLES.find((n) => n === syllables),
    themes: list(params.get("thema"), known.themes),
    where: one(params.get("wo"), WHERE),
  };
}

export function toParams(s: SearchState): URLSearchParams {
  const p = new URLSearchParams();
  const set = (key: string, value?: string | number) => value && p.set(key, String(value));
  set("q", s.q);
  set("buchstabe", s.letter);
  set("wortart", s.pos.map((v) => v.toLowerCase()).join(","));
  set("thema", s.themes.join(","));
  set("gebrauch", s.often);
  set("wo", s.where);
  set("bezirk", s.area);
  set("alter", s.age);
  set("inhalt", s.content.join(","));
  set("beginnt", s.starts);
  set("endet", s.ends);
  set("reim", s.rhyme);
  set("silben", s.syllables);
  set("laenge", s.length);
  set("berolinismus", s.berolinismus ? 1 : undefined);
  if (s.sort && s.sort !== effectiveSort({ ...s, sort: undefined })) p.set("sort", s.sort);
  return p;
}
