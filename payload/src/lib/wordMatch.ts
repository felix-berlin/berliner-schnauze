import { slugifyHeading } from "./lexicalHtml";

const UMLAUT: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };

/** Lowercase, ä→ae ö→oe ü→ue ß→ss, other accents and apostrophes dropped: the base of slugs and match keys. */
const fold = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => UMLAUT[c]!)
    .normalize("NFD")
    .replace(/[̀-ͯ'’`´]/g, "");

/** Slug of a word's spelling, in the form the existing words use ("Verfüjen, sich" → "verfuejen-sich"). */
export const wordSlug = (s: string): string => slugifyHeading(fold(s));

/**
 * Spelling-insensitive key: two words with the same key are probably one word written twice (hyphen, space, umlaut or
 * apostrophe variants, "Jrapschen" / "grapschen", doubled letters). shortcut: no fuzzy distance, only these spellings;
 * extend here if editors keep finding variants the key misses.
 */
export const matchKey = (s: string): string =>
  fold(s)
    .replace(/[^a-z0-9]/g, "")
    .replace(/j/g, "g")
    .replace(/(.)\1+/g, "$1");
