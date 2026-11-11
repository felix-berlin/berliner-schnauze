// Pure BON name rules (payload-app/bon-names): the filter for new names and the report limit for shown ones.

export const NAME_REPORT_LIMIT = 3;

// Short and German-focused on purpose. SUBSTRINGS are unambiguous enough to match inside any name; WORDS are short
// or risky (Marschall, Nazim, Thure, Heilmann) and only match a whole word or the whole collapsed name ("A r s c h").
// Extend from reports, not from guesses.
const SUBSTRINGS: string[] = [
  "hitler",
  "siegheil",
  "fuck",
  "fotze",
  "votze",
  "hurensohn",
  "schlampe",
  "wichser",
  "scheiss",
  "behindert",
  "nigger",
  "schwuchtel",
  "bitch",
];
const WORDS = new Set([
  "heil",
  "nazi",
  "fick",
  "hure",
  "huren",
  "nutte",
  "arsch",
  "spast",
  "neger",
  "nigga",
  "kanake",
  "cunt",
  "shit",
]);

const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
};

const normalize = (name: string): string =>
  name
    .toLowerCase()
    .replaceAll("ß", "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[013457@$]/g, (c) => LEET[c]!)
    .replace(/[^a-z]/g, "");

export const isOffensiveName = (name: string): boolean => {
  // A standalone 88 is the code for HH; 1988 is a year. Checked before the digits are dropped.
  if (/(?<!\d)88(?!\d)/.test(name)) return true;
  const words = name.split(/[\s._-]+/).map(normalize);
  const whole = normalize(name);
  return (
    SUBSTRINGS.some((w) => whole.includes(w)) || WORDS.has(whole) || words.some((w) => WORDS.has(w))
  );
};

export const cleanName = (name: string): string => (isOffensiveName(name) ? "Anonym" : name);

/** The name to show: hidden or reported often enough counts as no name. */
export const displayName = (game: {
  playerName?: string | null;
  nameHidden?: boolean | null;
  nameReports?: number | null;
}): string =>
  game.nameHidden || (game.nameReports ?? 0) >= NAME_REPORT_LIMIT
    ? "Anonym"
    : game.playerName || "Anonym";
