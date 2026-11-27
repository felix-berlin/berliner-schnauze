export const normalize = (text: string): string => text.trim().toLocaleLowerCase("de");

/** Letter runs of the normalized text; punctuation-only input gives []. */
export const terms = (text: string): string[] =>
  normalize(text)
    .split(/[^\p{L}]+/u)
    .filter(Boolean);

/**
 * Copy of `soundexCode` (payload-app/word-derived, natural's SoundEx): that module pulls nlp and
 * hyphenation into the bundle. Parity is pinned in rank.test.ts.
 */
export const soundex = (word: string): string => {
  if (!word) return "";
  const t = word.toLowerCase();
  const digits = (s: string) =>
    s
      .replace(/l/g, "4")
      .replace(/[mn]/g, "5")
      .replace(/r/g, "6")
      .replace(/[dt]/g, "3")
      .replace(/[cgjkqsxz]/g, "2")
      .replace(/[bfpv]/g, "1");
  const condense = (s: string) => s.replace(/(\d)?\1+/g, "$1");
  let rest = condense(digits(t.slice(1)));
  if (rest.charAt(0) === digits(t.charAt(0))) rest = rest.slice(1);
  rest = rest.replace(/\D/g, "");
  return t.charAt(0).toUpperCase() + rest.padEnd(3, "0").slice(0, 3);
};
