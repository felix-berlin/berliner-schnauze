import { isVowelChar, LETTER_RE } from "payload-app/word-derived";

export interface LetterTile {
  ch: string;
  /** Fill height 0-100: how common the letter is in German (0 = no known frequency). */
  pct: number;
  vowel: boolean;
}

// "e" (17.4 %) fills a tile; rarer letters keep a visible minimum so no tile looks empty.
const FULL_TILE_PERCENT = 18;
const MIN_FILL = 8;

/** One tile per letter of `word`; spaces, hyphens and other characters are skipped. */
export const toLetterTiles = (word: string, freq: Record<string, number>): LetterTile[] =>
  word
    .split("")
    .filter((ch) => LETTER_RE.test(ch))
    .map((ch) => {
      const lower = ch.toLowerCase();
      const percent = freq[lower];
      return {
        ch,
        pct: percent
          ? Math.min(100, Math.max(MIN_FILL, Math.round((percent / FULL_TILE_PERCENT) * 100)))
          : 0,
        vowel: isVowelChar(lower),
      };
    });
