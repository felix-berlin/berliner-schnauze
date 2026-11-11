// Pure BON name rules (payload-app/bon-names): the filter for new names and the report limit for shown ones.

export const NAME_REPORT_LIMIT = 3;

// Matching runs on the name after `prep` (compatibility forms, invisible characters and look-alike letters folded to Latin),
// mostly collapsed and normalized (see `normalize`).
// INSULTS and FAR_RIGHT (substrings) match anywhere ("Arschloch", "Nazi123", "xXNaziXx"); ALLOWED real names/words that contain one are removed
// first ("Marschall", "Nazim"). FAR_RIGHT_WHOLE entries are too short or too common to match inside a name and only match a whole
// normalized word, a letters-only word ("AfD2025") or the whole collapsed name ("A f D", "SS"); "heil" only the whole name
// or right before a HEIL_TARGETS word ("Hubertus Heil", "Heil, Hubertus" are names). FAR_RIGHT_CODES run on the prepped name, also with a run of single digits merged ("8 8", "8.8"), and 1488/444 also with any separators between digits removed ("148 8", "4 44").
// Insults: curated from de.txt of LDNOOBWV2 (https://github.com/LDNOOBWV2/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words_V2,
// CC0 1.0); dropped what is no insult or hits names/words by substring (horst, homo, depp, möse, titte, schwanz ...).
// Far-right: parties, groups, persons and codes (rule: bon-redesign SPEC §16). A bare 18 is an age and stays allowed.
// Extend from reports, not from guesses.
const INSULTS: string[] = [
  "arsch",
  "fick",
  "fotze",
  "votze",
  "hure",
  "wichs",
  "wixx",
  "wixer",
  "kacke",
  "scheiss",
  "schlampe",
  "schwuchtel",
  "schwuchtl",
  "nutte",
  "neger",
  "nigger",
  "nigga",
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "spast",
  "kanake",
  "bastard",
  "missgeburt",
  "mistkerl",
  "miststuck",
  "drecksack",
  "drecksau",
  "dreckskerl",
  "idiot",
  "trottel",
  "vollpfosten",
  "dumpfbacke",
  "kotzbrocken",
  "schweinehund",
  "schweinepriester",
  "schlappschwanz",
  "schwanzlutscher",
  "hodensack",
  "penis",
  "pimmel",
  "muschi",
  "titten",
  "pisser",
  "pissnelke",
  "verpiss",
  "vergewaltig",
  "padophil",
  "porno",
  "behindert",
];
// Far-right: persons, terms, parties and groups.
const FAR_RIGHT: string[] = [
  "hitler",
  "himmler",
  "goebbels",
  "gobbels",
  "rudolfhes",
  "fuhrer",
  "fuehrer",
  "endsieg",
  "siegheil",
  "zyklon",
  "volkstod",
  "whitepower",
  "wpww",
  "schwarzesonne",
  "wolfsangel",
  "kuhnengruss",
  "nazi",
  "nsdap",
  "jungealternative",
  "identitare",
  "reichsburger",
  "reichsbuerger",
  "hammerskin",
  "bloodandhonou",
  "bloodhonou",
  "dritterweg",
  "dritteweg",
  "iiiweg",
  "dieheimat",
  "dierechte",
  "heiladolf",
];
const ALLOWED: string[] = [
  "marsch",
  "barsch",
  "harsch",
  "karsch",
  "nazim",
  "nazir",
  "nazif",
  "nazia",
  "ignazio",
  "thure",
  "fickert",
  "fickel",
  "fickler",
  "fickenscher",
  "scunthorpe",
  "shitake",
  "schneger",
  "muschiol",
  "ignazius",
  "schure",
  "ashita",
  "ishita",
  "oshita",
  "ushita",
  "shitao",
  "peniston",
  "arschak",
  "fuhrerschein",
  "reisefuhrer",
  "bergfuhrer",
  "stadtfuhrer",
  "zugfuhrer",
  // "Die Heimat"/"Die Rechte" are phrases; words that merely start with them are fine
  "dieheimatlos",
  "dieheimatstadt",
  "dierechtesten",
];
// Real names that contain "nazi", allowed only as a whole word: as a substring they would shield "NaziHH" or "Banazi".
const ALLOWED_WHOLE = new Set(["nazih", "anazi", "alanazi"]);
const FAR_RIGHT_WHOLE = new Set([
  "heil",
  "arier",
  "afd",
  "npd",
  "afdler",
  "afdlerin",
  "ss",
  "hh",
  "sh",
  "dieheimat",
  "dierechte",
  "dereweg",
  "deriiiweg",
]);
// What makes "Heil" a salute when it comes right after it (any separators): "Heil Adolf", "Heil;AH", "Heil Höcke", "Heil dir".
// Whole words only, so "Heil Dirk" or "Heil Ahmed" stay names. 88 and 18 are compared as digits.
const HEIL_TARGETS = new Set([
  "adolf",
  "hitler",
  "ah",
  "hh",
  "deutschland",
  "deutsches",
  "deutsche",
  "reich",
  "germania",
  "germanien",
  "wotan",
  "odin",
  "hocke",
  "hoecke",
  "fuhrer",
  "fuehrer",
  "mir",
  "dir",
  "euch",
  "sieg",
  "vaterland",
  "volk",
  "ss",
  "88",
  "18",
]);
const CODE_1488 = /(?<!\d)1488(?!\d)/;
const CODE_444 = /(?<!\d)444(?!\d)/;
// Number codes and codes with a letter prefix, on the raw name. Digits next to a digit never match (1988).
const FAR_RIGHT_CODES = [
  /(?<!\d)88(?!\d)/, // HH; also 14/88 and 14 88
  CODE_1488,
  CODE_444,
  /(?<!\d)198(?!\d)/,
  /(?<!\d)168\s*:\s*1(?!\d)/,
  /(?<![\p{L}\d])(c|ah)\s?18(?!\d)/iu, // C18, AH18; a bare 18 is an age
  /combat\W*18(?!\d)/i,
  /\b(b\W?&?\W?h|blood\W*(and|&)?\W*hono(u)?r)\W*28(?!\d)/i, // 28 only with B&H context
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

// Cyrillic, Greek and Cherokee letters that look like Latin ones; lowercase forms are found through their uppercase.
const LOOKALIKE_FROM = "АВЕЅІЈКМНОРСТХУԀҺΑΒΕΖΗΙΚΜΝΟΡΤΥΧηνυᎪᏴᏟᎠᎬᏀᎻᏦᏞᎷᏢᏚᎢᏙᏔᏃ";
const LOOKALIKE_TO = "ABESIJKMHOPCTXYDHABEZHIKMNOPTYXnvuABCDEGHKLMPSTVWZ";
const LOOKALIKE = Object.fromEntries(Array.from(LOOKALIKE_FROM, (c, i) => [c, LOOKALIKE_TO[i]!]));

// Small capitals (not folded by NFKD) to Latin; ꜰ and ꜱ are the small-capital F and S.
const SMALL_CAPS_FROM = "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘʀꜱᴛᴜᴠᴡʏᴢ";
const SMALL_CAPS_TO = "abcdefghijklmnoprstuvwyz";
const SMALL_CAPS = Object.fromEntries(
  Array.from(SMALL_CAPS_FROM, (c, i) => [c, SMALL_CAPS_TO[i]!]),
);

/** The ASCII digit of any Unicode decimal digit ("٨" → "8"): Unicode assigns them only in runs of 10 from 0 to 9. */
const asciiDigit = (cp: number): string => {
  let zero = cp;
  while (/\p{Nd}/u.test(String.fromCodePoint(zero - 1))) zero--;
  return String((cp - zero) % 10);
};

/** Compatibility forms to plain ones (fullwidth, math bold, Ⅲ), no invisible characters or accents, look-alikes as Latin. */
const prep = (name: string): string =>
  Array.from(
    name
      .normalize("NFKD")
      .replace(/[\p{Cf}\p{M}]/gu, "")
      // Braille blank and Hangul fillers are letters/symbols to Unicode but render as a space.
      .replace(/[\u2800\u3164\u115F\u1160\uFFA0]/gu, " "),
    (c) => {
      const cp = c.codePointAt(0)!;
      // Regional Indicator Symbols U+1F1E6-1F1FF are A-Z.
      if (cp >= 0x1f1e6 && cp <= 0x1f1ff) return String.fromCharCode(97 + cp - 0x1f1e6);
      if (cp > 0x7f && /\p{Nd}/u.test(c)) return asciiDigit(cp);
      return SMALL_CAPS[c] ?? LOOKALIKE[c] ?? LOOKALIKE[c.toUpperCase()] ?? c;
    },
  )
    .join("")
    .toLowerCase()
    .replaceAll("ß", "ss")
    .replaceAll("ı", "i");

const normalize = (name: string): string =>
  name.replace(/[013457@$]/g, (c) => LEET[c]!).replace(/[^a-z]/g, "");

export type NameCategory = "far-right" | "offensive";

/** Why a name is refused: far-right wins over a plain insult. */
export const nameCategory = (raw: string): NameCategory | undefined => {
  const name = prep(raw);
  const words = name.split(/[\s._&:/-]+/).map(normalize);
  const whole = normalize(name);
  // Without leet, so "AfD2025" and "NPDler" yield afd/npd; two-letter codes only as real words ("Sh1ne").
  const letters = name.split(/[^\p{L}]+/u).filter((w) => w.length > 2);
  // Split at anything but letters and digits, so "Heil,Adolf" or "Heil(Adolf)" count as two words.
  const tokens = name.split(/[^\p{L}\d]+/u).filter(Boolean);
  const heilTarget = (t = "") => HEIL_TARGETS.has(t) || HEIL_TARGETS.has(normalize(t));
  // A run of single digits with separators between them, not touching another digit group on either side ("8.8", "1 4 8 8"; not "1 98", "8.8.1990").
  const codes = [
    name,
    name.replace(/(?<!\d[^\p{L}\d]*)\d(?:[^\p{L}\d]+\d)+(?![^\p{L}\d]*\d)/gu, (m) =>
      m.replace(/\D/g, ""),
    ),
  ];
  // Every separator between digits removed: only for 1488 and 444, so "1 98" or "8.8.1990" stay free.
  const joined = name.replace(/(?<=\d)[^\p{L}\d]+(?=\d)/gu, "");
  // Allowed words are cut out per word, so "Nazi Arsch" cannot lose letters across the gap.
  const rest = words
    .map((w) => (ALLOWED_WHOLE.has(w) ? "" : ALLOWED.reduce((n, a) => n.replaceAll(a, ""), w)))
    .join("");
  if (
    FAR_RIGHT_CODES.some((re) => codes.some((c) => re.test(c))) ||
    [CODE_1488, CODE_444].some((re) => re.test(joined)) ||
    FAR_RIGHT.some((w) => rest.includes(w)) ||
    FAR_RIGHT_WHOLE.has(whole) ||
    [...words, ...letters].some((w) => w !== "heil" && FAR_RIGHT_WHOLE.has(w)) ||
    // "Heil Adolf" and "HeilDeutschland" are caught, "Hubertus Heil" and "Heilmann" pass
    tokens.some((t, i) =>
      normalize(t) === "heil"
        ? heilTarget(tokens[i + 1])
        : normalize(t).startsWith("heil") && heilTarget(t.slice(4)),
    ) ||
    letters.some((w) => w.startsWith("npd"))
  )
    return "far-right";
  return INSULTS.some((w) => rest.includes(w)) ? "offensive" : undefined;
};

export const isOffensiveName = (name: string): boolean => nameCategory(name) !== undefined;

export const cleanName = (name: string): string => (isOffensiveName(name) ? "Anonym" : name);

/** Format characters (bidi overrides, zero-width) removed: "\u202EizaN" renders as "Nazi". ZWJ stays for emoji sequences. */
export const visibleName = (name: string): string => name.replace(/(?!\u200D)\p{Cf}/gu, "");

/** The name to show: hidden or reported often enough counts as no name; a stored name is cleaned again on the way out (rows from before a filter change). */
export const displayName = (game: {
  playerName?: string | null;
  nameHidden?: boolean | null;
  nameReports?: number | null;
}): string =>
  game.nameHidden || (game.nameReports ?? 0) >= NAME_REPORT_LIMIT
    ? "Anonym"
    : cleanName(visibleName(game.playerName ?? "") || "Anonym");
