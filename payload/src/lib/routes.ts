// Shared with the Astro app via `payload-app/routes`: keep it free of payload/next/config imports.

/** Public path prefix of each collection with its own page. */
export const ROUTES = { pages: "", posts: "/magazin", themen: "/themen", words: "/wort" } as const;

export type RoutedCollection = keyof typeof ROUTES;

export const isRoutedCollection = (slug: string | undefined): slug is RoutedCollection =>
  slug !== undefined && Object.hasOwn(ROUTES, slug);

/** Site path of a doc, e.g. `/wort/kiez`. */
export const docPath = (collection: RoutedCollection, slug: string): string =>
  `${ROUTES[collection]}/${slug}`;

/** Public site origin (CMS side): `SITE_URL`, else production. */
export const siteUrl = (): string => process.env.SITE_URL || "https://berliner-schnauze.wtf";

/** True when a Lexical state holds any text (an empty editor still has one empty paragraph). */
export const hasLexicalText = (node: unknown): boolean =>
  typeof node === "object" && node !== null
    ? "text" in node && typeof node.text === "string"
      ? node.text.trim() !== ""
      : Object.values(node).some(hasLexicalText)
    : false;

/** "a", "a & b", "a, b & c". */
const joinList = (items: string[]): string =>
  items.length > 1 ? `${items.slice(0, -1).join(", ")} & ${items.at(-1)}` : (items[0] ?? "");

const DESCRIPTION_MAX = 160;
const TITLE_MAX = 70;

/** What an entry has, so its SEO title and description only promise that. */
export type WordSeoFacts = {
  berlinerisch: string;
  hasAudio?: boolean;
  hasEtymology?: boolean;
  hasExamples?: boolean;
  translations: string[];
};

/**
 * SEO description of a word page, built only from what the entry has: the meanings first, then "Mit Aussprache und
 * Beispielsätzen" for the parts that exist. Too long: fewer meanings go before the parts. Without meanings: a plain dictionary line.
 * Also what the admin's "generate" button fills in.
 */
export const wordSeoDescription = (word: WordSeoFacts): string => {
  const { berlinerisch, translations } = word;
  const parts = [
    word.hasEtymology && "Etymologie",
    word.hasAudio && "Aussprache",
    word.hasExamples && "Beispielsätzen",
  ].filter((part): part is string => Boolean(part));
  const features = parts.length
    ? ` Mit ${joinList(parts)}.`
    : "";
  // An entry without meanings still gets a description (a page without one is worse than a plain one).
  if (!translations.length) return `${berlinerisch} im Berlinerisch-Wörterbuch der Berliner Schnauze.${features}`;
  const lead = `${berlinerisch} heißt auf Berlinerisch: `;
  for (let count = translations.length; count >= 1; count--) {
    for (const suffix of [features, ""]) {
      const text = `${lead}${translations.slice(0, count).join(", ")}.${suffix}`;
      if (text.length <= DESCRIPTION_MAX) return text;
    }
  }
  return `${lead}${translations[0]}`.slice(0, DESCRIPTION_MAX - 1) + "…";
};

/**
 * SEO title of a word page, also what the admin's "generate" button fills in. Names only the parts the entry
 * has ("Bedeutung, Beispiele & Herkunft"); too long: the last parts go first.
 */
export const wordSeoTitle = (word: WordSeoFacts): string => {
  const parts = [
    word.translations.length > 0 && "Bedeutung",
    word.hasExamples && "Beispiele",
    word.hasEtymology && "Herkunft",
    word.hasAudio && "Aussprache",
  ].filter((part): part is string => Boolean(part));
  const build = (shown: string[]) =>
    `${word.berlinerisch} auf Berlinerisch${shown.length ? ` — ${joinList(shown)}` : ""} | Berliner Schnauze`;
  for (let count = parts.length; count > 0; count--) {
    const title = build(parts.slice(0, count));
    if (title.length <= TITLE_MAX) return title;
  }
  return build([]);
};
