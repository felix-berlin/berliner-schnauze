// Pure BON name rules (payload-app/bon-names): the filter for new names and the report limit for shown ones.

export const NAME_REPORT_LIMIT = 3;

// Short and German-focused on purpose; matched as substrings of the normalized name, so every entry must stay
// clear of common names (false positives become "Anonym"). Extend from reports, not from guesses.
const BLOCKED: string[] = [
  "hitler",
  "heil",
  "nazi",
  "siegheil",
  "fick",
  "fuck",
  "fotze",
  "votze",
  "hure",
  "nutte",
  "schlampe",
  "wichser",
  "arsch",
  "scheiss",
  "spast",
  "behindert",
  "neger",
  "nigger",
  "nigga",
  "kanake",
  "schwuchtel",
  "bitch",
  "cunt",
  "shit",
];

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

export const isOffensiveName = (name: string): boolean =>
  // 88 = HH (Heil Hitler); checked before the digits are dropped.
  name.includes("88") || BLOCKED.some((word) => normalize(name).includes(word));

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
