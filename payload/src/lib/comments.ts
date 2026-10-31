// Pure comment rules, shared by Payload hooks and the site (`payload-app/comments`): no payload/next/config imports.
export const COMMENT_MIN = 10;
export const COMMENT_MAX = 1000;
export const NAME_MAX = 50;
export const EDIT_WINDOW_MS = 5 * 60_000;

export type CommentStatus = "published" | "pending" | "hidden" | "removed" | "deleted";

// scheme, `www.`, or `label.tld` (label >= 2 chars, letters-only TLD of 2-24): not `z.B.` or `1.5`
// ponytail: `ende.Dann` (no space after the period) also matches; fine for a spam filter.
const LINK = /https?:\/\/|www\./i;
const DOMAIN = /[a-z0-9][a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,24}(?![a-z0-9-])/i;

export const containsLink = (text: string): boolean => LINK.test(text) || DOMAIN.test(text);

export const hideThreshold = (score: number): number => Math.max(2, 3 + Math.floor(score / 10));

export const shouldAutoHide = (c: {
  status: CommentStatus;
  reviewed?: boolean | null;
  score: number;
  reportCount: number;
}): boolean => c.status === "published" && !c.reviewed && c.reportCount >= hideThreshold(c.score);

// Anonymous commenters get one of these per word (gender agrees with "Anonymer/Anonyme/Anonymes").
export const PSEUDONYMS = [
  "Anonymer Spätikiosk", "Anonyme Currywurst", "Anonymes Kindl", "Anonyme Spreewaldgurke", "Anonyme Schrippe",
  "Anonyme Molle", "Anonyme Bulette", "Anonymer Kiez-Kater", "Anonymer Fernsehturm", "Anonymes Ampelmännchen",
  "Anonyme Spree", "Anonyme BVG", "Anonyme Ringbahn", "Anonyme Kneipe", "Anonyme Eckkneipe",
  "Anonymer Hinterhof", "Anonymer Plattenbau", "Anonymer Döner", "Anonymer Pfannkuchen", "Anonyme Weiße mit Schuss",
  "Anonymer Späti", "Anonyme Berliner Luft", "Anonymer Brandenburger", "Anonymes Brandenburger Tor", "Anonymer Kudamm",
  "Anonyme Museumsinsel", "Anonymer Alexanderplatz", "Anonyme Weltzeituhr", "Anonymer Tempelhofer", "Anonymes Tempelhofer Feld",
  "Anonyme U-Bahn", "Anonyme S-Bahn", "Anonyme Straßenbahn", "Anonymer Schienenersatzverkehr", "Anonymer Fahrkartenkontrolleur",
  "Anonymer Flohmarkt", "Anonymer Mauerpark", "Anonyme Karaoke", "Anonyme Currywurst mit Pommes", "Anonyme Kartoffelsuppe",
  "Anonymer Eisbein", "Anonyme Buletten-Pfanne", "Anonymes Schultheiss", "Anonymes Berliner Pilsner", "Anonymer Kümmerling",
  "Anonymer Kiezspaziergang", "Anonyme Balkonien", "Anonymer Berliner Bär", "Anonymer Teddybär", "Anonyme Havel",
  "Anonymer Müggelsee", "Anonymer Wannsee", "Anonymer Grunewald", "Anonymes Kreuzberg", "Anonymer Prenzlauer Berg",
  "Anonymer Hauptbahnhof", "Anonymer Flughafen", "Anonymes Schlagloch", "Anonymer Baustellenkran", "Anonymer Kiezkönig",
] as const;

/** First unused pseudonym, starting at an index derived from the hex `tag`; when all are taken, the start name gets a number. */
export const pickPseudonym = (tag: string, taken: Set<string>): string => {
  const start = (parseInt(tag.slice(0, 8), 16) || 0) % PSEUDONYMS.length;
  for (let i = 0; i < PSEUDONYMS.length; i++) {
    const name = PSEUDONYMS[(start + i) % PSEUDONYMS.length];
    if (!taken.has(name)) return name;
  }
  let n = 2;
  while (taken.has(`${PSEUDONYMS[start]} ${n}`)) n++;
  return `${PSEUDONYMS[start]} ${n}`;
};
